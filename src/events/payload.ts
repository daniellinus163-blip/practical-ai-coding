import { EVENT_TYPES, type EventType, type SafePayload } from "@/events/types";

const BANNED_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "session",
  "cookie",
  "email",
  "phone",
  "message",
  "name",
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}

export function sanitizePayload(raw: unknown): SafePayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: SafePayload = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (BANNED_KEYS.includes(lower)) continue;
    if (value === null) {
      out[key] = null;
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

export function payloadHasSecrets(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  return Object.keys(raw as object).some((key) =>
    ["password", "token", "secret", "authorization", "api_key", "access_token"].includes(key.toLowerCase()),
  );
}

export function validateEventPayload(type: EventType, payload: SafePayload): string | null {
  switch (type) {
    case "inquiry.received":
      if (!asUuid(payload.inquiry_id) || !asUuid(payload.lead_id)) return "inquiry.received needs inquiry_id and lead_id";
      return null;
    case "configuration.saved":
      if (!asUuid(payload.configuration_id)) return "configuration.saved needs configuration_id";
      return null;
    case "lead.stage_changed":
      if (!asUuid(payload.lead_id) || typeof payload.to_status !== "string") {
        return "lead.stage_changed needs lead_id and to_status";
      }
      return null;
    case "follow_up.reminder":
      if (!asUuid(payload.lead_id) || !asUuid(payload.inquiry_id)) return "follow_up.reminder needs lead_id and inquiry_id";
      return null;
    case "inquiry.staff_reply":
      if (!asUuid(payload.lead_id) || !asUuid(payload.inquiry_id) || !asUuid(payload.activity_id)) {
        return "inquiry.staff_reply needs lead_id, inquiry_id, and activity_id";
      }
      return null;
    case "integration.delivery_failed":
      if (!asUuid(payload.failed_event_id) || typeof payload.integration !== "string") {
        return "integration.delivery_failed needs failed_event_id and integration";
      }
      return null;
    default:
      return "unknown event type";
  }
}

export function asUuid(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

export function n8nBody(event: {
  id: string;
  event_type: EventType;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  payload: SafePayload;
}) {
  return {
    id: event.id,
    type: event.event_type,
    entity_type: event.entity_type,
    entity_id: event.entity_id,
    created_at: event.created_at,
    data: event.payload,
  };
}
