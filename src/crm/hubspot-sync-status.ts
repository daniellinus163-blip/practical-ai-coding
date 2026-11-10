import type { DeliveryRow } from "@/events/types";
import type { AutomationEventRow } from "@/crm/build-lead-timeline";

export type HubSpotSyncState = "synced" | "pending" | "failed" | "retry_required" | "not_configured" | "not_attempted";

export type HubSpotObjectSync = {
  state: HubSpotSyncState;
  label: string;
  detail: string | null;
  recordId: string | null;
  canRetry: boolean;
  retryEventId: string | null;
};

export const HUBSPOT_STATE_LABEL: Record<HubSpotSyncState, string> = {
  synced: "Synced",
  pending: "Pending",
  failed: "Failed",
  retry_required: "Retry required",
  not_configured: "Not configured",
  not_attempted: "Not attempted",
};

export function parseHubspotExternalIds(externalId: string | null | undefined): {
  contactId: string | null;
  dealId: string | null;
} {
  if (!externalId) return { contactId: null, dealId: null };
  let contactId: string | null = null;
  let dealId: string | null = null;
  for (const part of externalId.split(";")) {
    const [kind, id] = part.split(":");
    if (kind === "contact" && id) contactId = id;
    if (kind === "deal" && id) dealId = id;
  }
  return { contactId, dealId };
}

type DeriveInput = {
  hubspotDelivery: DeliveryRow | null | undefined;
  event: AutomationEventRow | null | undefined;
  mappedRecordId: string | null;
  recordKind: "contact" | "deal";
};

/** Status is derived from delivery rows and event state — never from mappings alone. */
export function deriveHubSpotObjectSync(input: DeriveInput): HubSpotObjectSync {
  const { hubspotDelivery, event, mappedRecordId, recordKind } = input;
  const parsed = parseHubspotExternalIds(hubspotDelivery?.external_id);
  const recordId =
    recordKind === "contact"
      ? mappedRecordId ?? parsed.contactId
      : mappedRecordId ?? parsed.dealId;

  const retryEventId = event?.id ?? null;
  const canRetry = Boolean(
    retryEventId &&
      (hubspotDelivery?.status === "failed" ||
        event?.status === "failed" ||
        (event?.status === "queued" && Boolean(event.last_error))),
  );

  if (hubspotDelivery?.status === "skipped" && hubspotDelivery.last_error === "hubspot_not_configured") {
    return {
      state: "not_configured",
      label: HUBSPOT_STATE_LABEL.not_configured,
      detail: "HubSpot token or pipeline is not set on the server.",
      recordId,
      canRetry: false,
      retryEventId: null,
    };
  }

  if (hubspotDelivery?.status === "succeeded") {
    return {
      state: "synced",
      label: HUBSPOT_STATE_LABEL.synced,
      detail: recordId ? `HubSpot ${recordKind} id ${recordId}` : "API reported success (id not stored yet)",
      recordId,
      canRetry: false,
      retryEventId: null,
    };
  }

  if (hubspotDelivery?.status === "failed") {
    const retryable = hubspotDelivery.retryable || event?.status === "failed";
    return {
      state: retryable ? "retry_required" : "failed",
      label: retryable ? HUBSPOT_STATE_LABEL.retry_required : HUBSPOT_STATE_LABEL.failed,
      detail: hubspotDelivery.last_error ?? event?.last_error ?? null,
      recordId: recordId && retryable ? recordId : null,
      canRetry,
      retryEventId: canRetry ? retryEventId : null,
    };
  }

  if (event?.status === "processing" || event?.status === "queued") {
    return {
      state: "pending",
      label: HUBSPOT_STATE_LABEL.pending,
      detail: event.last_error ? `Worker: ${event.last_error}` : "Waiting for automation worker",
      recordId: null,
      canRetry: false,
      retryEventId: null,
    };
  }

  if (event?.status === "dead" || event?.status === "failed") {
    return {
      state: "retry_required",
      label: HUBSPOT_STATE_LABEL.retry_required,
      detail: event.last_error ?? hubspotDelivery?.last_error ?? null,
      recordId: null,
      canRetry: Boolean(retryEventId),
      retryEventId,
    };
  }

  if (hubspotDelivery?.status === "skipped") {
    return {
      state: "failed",
      label: HUBSPOT_STATE_LABEL.failed,
      detail: hubspotDelivery.last_error ?? "HubSpot delivery was skipped",
      recordId: null,
      canRetry: false,
      retryEventId: null,
    };
  }

  return {
    state: "not_attempted",
    label: HUBSPOT_STATE_LABEL.not_attempted,
    detail: event ? null : "No inquiry automation event found",
    recordId: null,
    canRetry: false,
    retryEventId: null,
  };
}
