export const EVENT_TYPES = [
  "inquiry.received",
  "configuration.saved",
  "lead.stage_changed",
  "follow_up.reminder",
  "integration.delivery_failed",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const INTEGRATIONS = ["internal", "n8n", "hubspot", "resend", "resend_staff"] as const;
export type IntegrationName = (typeof INTEGRATIONS)[number];

export type EventStatus = "queued" | "processing" | "succeeded" | "failed" | "dead" | "skipped";
export type DeliveryStatus = "pending" | "succeeded" | "failed" | "skipped";

export type SafePayload = Record<string, string | number | boolean | null>;

export type AutomationEvent = {
  id: string;
  event_type: EventType;
  entity_type: string | null;
  entity_id: string | null;
  lead_id: string | null;
  payload: SafePayload;
  status: EventStatus;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  idempotency_key: string | null;
  created_at: string;
};

export type DeliveryRow = {
  event_id: string;
  integration: IntegrationName;
  status: DeliveryStatus;
  attempt_count: number;
  retryable: boolean;
  last_error: string | null;
  external_id: string | null;
};

export type DeliveryResult = {
  status: DeliveryStatus;
  retryable: boolean;
  error?: string;
  externalId?: string;
};

export type ContactContext = {
  email: string | null;
  name: string | null;
  leadId: string | null;
  inquiryId: string | null;
  vehicleSlug: string | null;
  leadStatus: string | null;
};
