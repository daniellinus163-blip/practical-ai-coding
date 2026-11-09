import { integrationsFor, type IntegrationConfig } from "@/events/config";
import { integrationLog } from "@/events/log";
import { sanitizePayload, validateEventPayload } from "@/events/payload";
import type {
  AutomationEvent,
  ContactContext,
  DeliveryResult,
  DeliveryRow,
  IntegrationName,
} from "@/events/types";

export type EventStore = {
  claim: (limit: number, worker: string) => Promise<AutomationEvent[]>;
  complete: (id: string, status: AutomationEvent["status"], error: string | null) => Promise<void>;
  listDeliveries: (eventId: string) => Promise<DeliveryRow[]>;
  upsertDelivery: (
    eventId: string,
    integration: IntegrationName,
    result: DeliveryResult,
  ) => Promise<void>;
  loadContact: (event: AutomationEvent) => Promise<ContactContext>;
  enqueueDeliveryFailed: (event: AutomationEvent, integration: IntegrationName, error: string) => Promise<void>;
};

export type DeliverFn = (
  integration: IntegrationName,
  event: AutomationEvent,
  contact: ContactContext,
) => Promise<DeliveryResult>;

export async function processQueuedEvents(input: {
  store: EventStore;
  deliver: DeliverFn;
  config: IntegrationConfig;
  worker?: string;
  limit?: number;
  log?: (entry: Record<string, string | number | undefined>) => void;
}): Promise<{ claimed: number; processed: number }> {
  const claimed = await input.store.claim(input.limit ?? 10, input.worker ?? "worker");
  let processed = 0;
  for (const event of claimed) {
    await processOneEvent({ ...input, event });
    processed += 1;
  }
  return { claimed: claimed.length, processed };
}

export async function processOneEvent(input: {
  store: EventStore;
  deliver: DeliverFn;
  config: IntegrationConfig;
  event: AutomationEvent;
  log?: (entry: Record<string, string | number | undefined>) => void;
}): Promise<void> {
  const event: AutomationEvent = {
    ...input.event,
    payload: sanitizePayload(input.event.payload),
  };
  const invalid = validateEventPayload(event.event_type, event.payload);
  if (invalid) {
    await input.store.complete(event.id, "dead", invalid);
    return;
  }

  const needed = integrationsFor(event.event_type);
  const existing = await input.store.listDeliveries(event.id);
  const contact = await input.store.loadContact(event);
  const outcomes: DeliveryRow[] = [];

  for (const integration of needed) {
    const prior = existing.find((row) => row.integration === integration);
    if (prior && (prior.status === "succeeded" || prior.status === "skipped")) {
      outcomes.push(prior);
      continue;
    }
    if (prior && prior.status === "failed" && prior.retryable === false) {
      outcomes.push(prior);
      continue;
    }
    const result = await input.deliver(integration, event, contact);
    await input.store.upsertDelivery(event.id, integration, result);
    input.log?.(
      integrationLog({
        eventId: event.id,
        type: event.event_type,
        integration,
        status: result.status,
        error: result.error,
      }),
    );
    outcomes.push({
      event_id: event.id,
      integration,
      status: result.status,
      attempt_count: (prior?.attempt_count ?? 0) + 1,
      retryable: result.retryable,
      last_error: result.error ?? null,
      external_id: result.externalId ?? null,
    });
  }

  const retryable = outcomes.filter((row) => row.status === "failed" && row.retryable);
  const permanent = outcomes.filter((row) => row.status === "failed" && !row.retryable);
  const pendingWork = retryable.length > 0;

  if (pendingWork) {
    const nextStatus = event.attempt_count >= event.max_attempts ? "dead" : "failed";
    await input.store.complete(event.id, nextStatus, retryable[0]?.last_error ?? "retryable_failure");
    return;
  }

  for (const row of permanent) {
    if (row.integration === "n8n") continue;
    await input.store.enqueueDeliveryFailed(event, row.integration, row.last_error ?? "permanent_failure");
  }

  if (event.event_type === "inquiry.received") {
    const staff = outcomes.find((row) => row.integration === "resend_staff");
    const staffOk = staff && (staff.status === "succeeded" || staff.status === "skipped");
    const customerOnlyPermanent =
      permanent.length > 0 && permanent.every((row) => row.integration === "resend");
    if (staffOk && customerOnlyPermanent) {
      await input.store.complete(event.id, "succeeded", null);
      return;
    }
  }

  const allOk = outcomes.every((row) => row.status === "succeeded" || row.status === "skipped");
  if (allOk) {
    await input.store.complete(event.id, "succeeded", null);
    return;
  }
  const dead = event.attempt_count >= event.max_attempts ? "dead" : "failed";
  await input.store.complete(event.id, dead, permanent[0]?.last_error ?? "delivery_failed");
}
