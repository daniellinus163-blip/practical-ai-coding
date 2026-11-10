import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildLeadTimeline,
  type AutomationEventRow,
  type DeliveryRow,
  type TimelineItem,
} from "@/crm/build-lead-timeline";
import { hubspotPortalIdFromEnv, sanitizeHubspotRecordId } from "@/crm/hubspot-links";
import { deriveHubSpotObjectSync, type HubSpotObjectSync } from "@/crm/hubspot-sync-status";
import type { DeliveryRow as ProcessorDeliveryRow } from "@/events/types";

export type LeadIntegrationView = {
  hubspotContactId: string | null;
  hubspotDealId: string | null;
  hubspotPortalConfigured: boolean;
  hubspotContactSync: HubSpotObjectSync;
  hubspotDealSync: HubSpotObjectSync;
  hubspotInquiryEventId: string | null;
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
        "id, event_id, integration, status, attempt_count, retryable, last_error, external_id, completed_at, updated_at",
      )
      .in("event_id", eventIds)
      .order("updated_at", { ascending: true });
    deliveries = (data ?? []) as DeliveryRow[];
  }

  const followUp = leadRelated.find((e) => e.event_type === "follow_up.reminder");

  const inquiryEventRow = inquiryEvent.data ?? null;
  const inquiryHubspotDelivery = inquiryEventRow
    ? deliveries.find((d) => d.event_id === inquiryEventRow.id && d.integration === "hubspot")
    : undefined;

  const hubspotContactSync = deriveHubSpotObjectSync({
    hubspotDelivery: toProcessorDelivery(inquiryHubspotDelivery),
    event: inquiryEventRow,
    mappedRecordId: hubspotContactId,
    recordKind: "contact",
  });
  const hubspotDealSync = deriveHubSpotObjectSync({
    hubspotDelivery: toProcessorDelivery(inquiryHubspotDelivery),
    event: inquiryEventRow,
    mappedRecordId: hubspotDealId,
    recordKind: "deal",
  });

  return {
    hubspotContactId,
    hubspotDealId,
    hubspotPortalConfigured: Boolean(hubspotPortalIdFromEnv()),
    hubspotContactSync,
    hubspotDealSync,
    hubspotInquiryEventId: inquiryEventRow?.id ?? null,
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

export type HubSpotStageSync = {
  eventId: string | null;
  eventStatus: string | null;
  deliveryStatus: string | null;
  lastError: string | null;
  canRetry: boolean;
};

function toProcessorDelivery(row: DeliveryRow | undefined): ProcessorDeliveryRow | null {
  if (!row) return null;
  return {
    event_id: row.event_id,
    integration: row.integration as ProcessorDeliveryRow["integration"],
    status: row.status as ProcessorDeliveryRow["status"],
    attempt_count: row.attempt_count ?? 0,
    retryable: row.retryable ?? row.status === "failed",
    last_error: row.last_error,
    external_id: row.external_id,
  };
}

export function hubspotStageSyncStatus(view: LeadIntegrationView): HubSpotStageSync {
  const stageEvents = view.events
    .filter((e) => e.event_type === "lead.stage_changed")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const latest = stageEvents[stageEvents.length - 1];
  if (!latest) {
    return { eventId: null, eventStatus: null, deliveryStatus: null, lastError: null, canRetry: false };
  }
  const hubspot = view.deliveries.find((d) => d.event_id === latest.id && d.integration === "hubspot");
  const derived = deriveHubSpotObjectSync({
    hubspotDelivery: toProcessorDelivery(hubspot),
    event: latest,
    mappedRecordId: view.hubspotDealId,
    recordKind: "deal",
  });
  return {
    eventId: latest.id,
    eventStatus: latest.status,
    deliveryStatus: derived.label,
    lastError: derived.detail,
    canRetry: derived.canRetry,
  };
}
