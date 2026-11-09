import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildLeadTimeline,
  type AutomationEventRow,
  type DeliveryRow,
  type TimelineItem,
} from "@/crm/build-lead-timeline";
import { hubspotPortalIdFromEnv, sanitizeHubspotRecordId } from "@/crm/hubspot-links";

export type LeadIntegrationView = {
  hubspotContactId: string | null;
  hubspotDealId: string | null;
  hubspotPortalConfigured: boolean;
  timeline: TimelineItem[];
  events: AutomationEventRow[];
  deliveries: DeliveryRow[];
  eventSummary: {
    inquiryEventStatus: string | null;
    followUpDueAt: string | null;
    followUpStatus: string | null;
  };
};

export async function loadLeadIntegrationView(
  admin: SupabaseClient,
  input: { leadId: string; inquiryId: string | null; inquirySubmittedAt?: string | null },
): Promise<LeadIntegrationView> {
  const [contactMap, dealMap, inquiryEvent, leadEvents] = await Promise.all([
    admin
      .from("integration_mappings")
      .select("provider_id")
      .eq("provider", "hubspot")
      .eq("provider_object", "contact")
      .eq("local_type", "lead")
      .eq("local_id", input.leadId)
      .maybeSingle(),
    input.inquiryId
      ? admin
          .from("integration_mappings")
          .select("provider_id")
          .eq("provider", "hubspot")
          .eq("provider_object", "deal")
          .eq("local_type", "inquiry")
          .eq("local_id", input.inquiryId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    input.inquiryId
      ? admin
          .from("automation_events")
          .select(
            "id, event_type, status, attempt_count, last_error, created_at, completed_at, next_attempt_at",
          )
          .eq("idempotency_key", `inquiry.received:${input.inquiryId}`)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from("automation_events")
      .select("id, event_type, status, attempt_count, last_error, created_at, completed_at, next_attempt_at")
      .in("event_type", ["lead.stage_changed", "follow_up.reminder", "inquiry.staff_reply"])
      .contains("payload", { lead_id: input.leadId })
      .order("created_at", { ascending: true }),
  ]);

  const hubspotContactId = sanitizeHubspotRecordId(contactMap.data?.provider_id ?? null);
  const hubspotDealId = sanitizeHubspotRecordId(dealMap.data?.provider_id ?? null);

  const leadRelated = leadEvents.data ?? [];

  const events: AutomationEventRow[] = [];
  if (inquiryEvent.data) events.push(inquiryEvent.data);
  events.push(...leadRelated);

  const eventIds = events.map((e) => e.id);
  let deliveries: DeliveryRow[] = [];
  if (eventIds.length > 0) {
    const { data } = await admin
      .from("automation_event_deliveries")
      .select(
        "id, event_id, integration, status, attempt_count, last_error, external_id, completed_at, updated_at",
      )
      .in("event_id", eventIds)
      .order("updated_at", { ascending: true });
    deliveries = (data ?? []) as DeliveryRow[];
  }

  const followUp = leadRelated.find((e) => e.event_type === "follow_up.reminder");

  return {
    hubspotContactId,
    hubspotDealId,
    hubspotPortalConfigured: Boolean(hubspotPortalIdFromEnv()),
    timeline: buildLeadTimeline({
      inquirySubmittedAt: input.inquirySubmittedAt,
      events,
      deliveries,
    }),
    events,
    deliveries,
    eventSummary: {
      inquiryEventStatus: inquiryEvent.data?.status ?? null,
      followUpDueAt: followUp?.next_attempt_at ?? null,
      followUpStatus: followUp?.status ?? null,
    },
  };
}

export function formatLeadReference(leadId: string): string {
  return `FSA-${leadId.slice(0, 8).toUpperCase()}`;
}
