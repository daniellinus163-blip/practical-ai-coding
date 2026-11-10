import type { SupabaseClient } from "@supabase/supabase-js";
import { buildConfigurationDetails, formatConfigurationForHubSpot } from "@/crm/configuration-summary";
import { catalogRepository } from "@/catalog/local-repository";
import { safeLogMessage } from "@/events/log";
import { sanitizePayload } from "@/events/payload";
import type { EventStore } from "@/events/processor";
import type { AutomationEvent, ContactContext, DeliveryRow, EventType } from "@/events/types";

export function createSupabaseEventStore(admin: SupabaseClient): EventStore {
  return {
    async claim(limit, worker) {
      const { data, error } = await admin.rpc("claim_automation_events", {
        p_limit: limit,
        p_worker: worker,
      });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map(eventFromRow);
    },
    async complete(id, status, error) {
      const { error: rpcError } = await admin.rpc("complete_automation_event", {
        p_event_id: id,
        p_status: status,
        p_error: error,
      });
      if (rpcError) throw rpcError;
    },
    async listDeliveries(eventId) {
      const { data, error } = await admin
        .from("automation_event_deliveries")
        .select("event_id, integration, status, attempt_count, retryable, last_error, external_id")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data ?? []) as DeliveryRow[];
    },
    async upsertDelivery(eventId, integration, result) {
      const { data: current } = await admin
        .from("automation_event_deliveries")
        .select("attempt_count")
        .eq("event_id", eventId)
        .eq("integration", integration)
        .maybeSingle();
      const attempt = (current?.attempt_count ?? 0) + 1;
      const { error } = await admin.from("automation_event_deliveries").upsert(
        {
          event_id: eventId,
          integration,
          status: result.status,
          attempt_count: attempt,
          retryable: result.retryable,
          last_error: result.error ? safeLogMessage(result.error).slice(0, 400) : null,
          external_id: result.externalId ?? null,
          completed_at: result.status === "pending" ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,integration" },
      );
      if (error) throw error;
    },
    async loadContact(event) {
      return loadContact(admin, event);
    },
    async enqueueDeliveryFailed(event, integration, error) {
      await admin.rpc("enqueue_automation_event", {
        p_event_type: "integration.delivery_failed",
        p_entity_type: "automation_event",
        p_entity_id: event.id,
        p_lead_id: event.lead_id,
        p_payload: {
          failed_event_id: event.id,
          integration,
          error: error.slice(0, 120),
        },
        p_idempotency_key: `integration.delivery_failed:${event.id}:${integration}`,
        p_next_attempt_at: new Date().toISOString(),
      });
    },
  };
}

export function createSupabaseMappings(admin: SupabaseClient) {
  return {
    async get(provider: string, object: string, localType: string, localId: string) {
      const { data } = await admin
        .from("integration_mappings")
        .select("provider_id")
        .eq("provider", provider)
        .eq("provider_object", object)
        .eq("local_type", localType)
        .eq("local_id", localId)
        .maybeSingle();
      return data?.provider_id ?? null;
    },
    async put(provider: string, object: string, localType: string, localId: string, providerId: string) {
      await admin.from("integration_mappings").upsert(
        {
          provider,
          provider_object: object,
          local_type: localType,
          local_id: localId,
          provider_id: providerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider,provider_object,local_type,local_id" },
      );
    },
  };
}

export function createInternalStore(admin: SupabaseClient) {
  return {
    async ensureFollowUpTask(leadId: string, sourceKey: string, title: string, due: string) {
      const { data, error } = await admin.rpc("upsert_follow_up_task", {
        p_lead_id: leadId,
        p_source_key: sourceKey,
        p_title: title,
        p_due: due,
      });
      if (error) throw error;
      return typeof data === "string" ? data : null;
    },
  };
}

async function loadStaffReplyBody(
  admin: SupabaseClient,
  event: AutomationEvent,
): Promise<string | null> {
  const activityId =
    typeof event.payload.activity_id === "string" ? event.payload.activity_id : null;
  if (!activityId) return null;
  const { data } = await admin.from("lead_activities").select("body").eq("id", activityId).maybeSingle();
  return data?.body ?? null;
}

async function loadContact(admin: SupabaseClient, event: AutomationEvent): Promise<ContactContext> {
  const staffReplyBody =
    event.event_type === "inquiry.staff_reply" ? await loadStaffReplyBody(admin, event) : null;
  const leadId =
    event.lead_id || (typeof event.payload.lead_id === "string" ? event.payload.lead_id : null);
  const inquiryId =
    typeof event.payload.inquiry_id === "string" ? event.payload.inquiry_id : event.entity_id;
  if (leadId) {
    const { data } = await admin
      .from("leads")
      .select("id, email, name, vehicle_slug, status, inquiry_id")
      .eq("id", leadId)
      .maybeSingle();
    if (data) {
      const message = await loadInquiryMessage(admin, data.inquiry_id ?? inquiryId);
      const configurationSummary = await loadInquiryConfigurationSummary(
        admin,
        data.inquiry_id ?? inquiryId,
        data.vehicle_slug,
      );
      return {
        email: data.email ?? null,
        name: data.name ?? null,
        leadId: data.id,
        inquiryId: data.inquiry_id ?? inquiryId,
        vehicleSlug: data.vehicle_slug ?? null,
        leadStatus: data.status ?? null,
        message,
        staffReplyBody,
        configurationSummary,
      };
    }
  }
  if (inquiryId) {
    const { data } = await admin
      .from("inquiries")
      .select("id, email, name, vehicle_slug, message")
      .eq("id", inquiryId)
      .maybeSingle();
    if (data) {
      const configurationSummary = await loadInquiryConfigurationSummary(admin, data.id, data.vehicle_slug);
      return {
        email: data.email ?? null,
        name: data.name ?? null,
        leadId,
        inquiryId: data.id,
        vehicleSlug: data.vehicle_slug ?? null,
        leadStatus: "new",
        message: data.message ?? null,
        staffReplyBody,
        configurationSummary,
      };
    }
  }
  return {
    email: null,
    name: null,
    leadId,
    inquiryId,
    vehicleSlug: typeof event.payload.vehicle_slug === "string" ? event.payload.vehicle_slug : null,
    leadStatus: typeof event.payload.to_status === "string" ? event.payload.to_status : null,
    message: null,
    staffReplyBody,
    configurationSummary: null,
  };
}

async function loadInquiryConfigurationSummary(
  admin: SupabaseClient,
  inquiryId: string | null,
  vehicleSlug: string | null,
) {
  if (!inquiryId) return null;
  const { data } = await admin
    .from("inquiries")
    .select("configuration_snapshot, configuration_id, vehicle_slug")
    .eq("id", inquiryId)
    .maybeSingle();
  if (!data) return null;
  const slug = vehicleSlug ?? data.vehicle_slug;
  const vehicle = slug ? await catalogRepository.getVehicleBySlug(slug) : null;
  let savedName: string | null = null;
  if (data.configuration_id) {
    const { data: saved } = await admin
      .from("saved_configurations")
      .select("name")
      .eq("id", data.configuration_id)
      .maybeSingle();
    savedName = saved?.name ?? null;
  }
  const rows = buildConfigurationDetails({
    snapshot: data.configuration_snapshot,
    vehicle,
    savedConfigurationName: savedName,
    savedConfigurationId: data.configuration_id,
    defaultTrimName: vehicle?.configurations.find((c) => c.isDefault)?.name ?? null,
  });
  return formatConfigurationForHubSpot(rows);
}

async function loadInquiryMessage(admin: SupabaseClient, inquiryId: string | null) {
  if (!inquiryId) return null;
  const { data } = await admin.from("inquiries").select("message").eq("id", inquiryId).maybeSingle();
  return data?.message ?? null;
}

export function eventFromRow(row: Record<string, unknown>): AutomationEvent {
  return {
    id: String(row.id),
    event_type: row.event_type as EventType,
    entity_type: (row.entity_type as string) ?? null,
    entity_id: (row.entity_id as string) ?? null,
    lead_id: (row.lead_id as string) ?? null,
    payload: sanitizePayload(row.payload),
    status: row.status as AutomationEvent["status"],
    attempt_count: Number(row.attempt_count ?? 0),
    max_attempts: Number(row.max_attempts ?? 8),
    next_attempt_at: String(row.next_attempt_at ?? ""),
    last_error: (row.last_error as string) ?? null,
    idempotency_key: (row.idempotency_key as string) ?? null,
    created_at: String(row.created_at ?? ""),
  };
}

