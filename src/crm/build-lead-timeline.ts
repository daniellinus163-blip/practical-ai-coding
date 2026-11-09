export type AutomationEventRow = {
  id: string;
  event_type: string;
  status: string;
  attempt_count: number | null;
  last_error: string | null;
  created_at: string;
  completed_at: string | null;
  next_attempt_at: string | null;
};

export type DeliveryRow = {
  id: string;
  event_id: string;
  integration: string;
  status: string;
  attempt_count: number | null;
  last_error: string | null;
  external_id: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type TimelineItem = {
  id: string;
  at: string;
  title: string;
  detail?: string;
  tone: "ok" | "warn" | "error" | "neutral";
};

function toneFromStatus(status: string): TimelineItem["tone"] {
  if (status === "succeeded") return "ok";
  if (status === "failed" || status === "dead") return "error";
  if (status === "skipped") return "warn";
  if (status === "queued" || status === "processing") return "neutral";
  return "neutral";
}

function deliveryTitle(integration: string, status: string): string {
  const label = integrationLabel(integration);
  if (integration === "resend" && status === "succeeded") {
    return `${label}: API accepted send (delivery not confirmed)`;
  }
  if (integration === "resend_staff" && status === "succeeded") {
    return `${label}: API accepted staff notification (delivery not confirmed)`;
  }
  if (status === "succeeded") return `${label}: succeeded`;
  if (status === "failed") return `${label}: failed`;
  if (status === "skipped") return `${label}: skipped`;
  if (status === "pending") return `${label}: pending`;
  return `${label}: ${status}`;
}

function integrationLabel(integration: string): string {
  switch (integration) {
    case "hubspot":
      return "HubSpot";
    case "resend":
      return "Customer email";
    case "resend_staff":
      return "Staff email";
    case "internal":
      return "Follow-up task";
    case "n8n":
      return "n8n";
    default:
      return integration;
  }
}

function eventTitle(event: AutomationEventRow): string {
  switch (event.event_type) {
    case "inquiry.received":
      return "Inquiry automation";
    case "lead.stage_changed":
      return "Pipeline stage sync";
    case "follow_up.reminder":
      return "24-hour follow-up";
    default:
      return event.event_type;
  }
}

export function buildLeadTimeline(input: {
  inquirySubmittedAt?: string | null;
  events: AutomationEventRow[];
  deliveries: DeliveryRow[];
}): TimelineItem[] {
  const items: TimelineItem[] = [];

  if (input.inquirySubmittedAt) {
    items.push({
      id: "inquiry-submitted",
      at: input.inquirySubmittedAt,
      title: "Inquiry received on website",
      tone: "ok",
    });
  }

  const deliveriesByEvent = new Map<string, DeliveryRow[]>();
  for (const row of input.deliveries) {
    const list = deliveriesByEvent.get(row.event_id) ?? [];
    list.push(row);
    deliveriesByEvent.set(row.event_id, list);
  }

  const sortedEvents = [...input.events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  for (const event of sortedEvents) {
    items.push({
      id: `event-${event.id}`,
      at: event.created_at,
      title: `${eventTitle(event)} · ${event.status}`,
      detail: event.last_error
        ? `Attempts: ${event.attempt_count ?? 0}. ${event.last_error}`
        : event.attempt_count
          ? `Attempts: ${event.attempt_count}`
          : undefined,
      tone: toneFromStatus(event.status),
    });

    const related = [...(deliveriesByEvent.get(event.id) ?? [])].sort(
      (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    );

    for (const delivery of related) {
      const at = delivery.completed_at ?? delivery.updated_at;
      const parts: string[] = [];
      if (delivery.last_error) parts.push(delivery.last_error);
      if (delivery.external_id) {
        if (delivery.integration === "hubspot") {
          parts.push(`External ref: ${delivery.external_id}`);
        } else if (delivery.integration === "resend" || delivery.integration === "resend_staff") {
          parts.push(`Resend message id: ${delivery.external_id} (not proof of inbox delivery)`);
        } else {
          parts.push(`External id: ${delivery.external_id}`);
        }
      }
      if (delivery.attempt_count) parts.push(`Attempts: ${delivery.attempt_count}`);

      items.push({
        id: `delivery-${delivery.id}`,
        at,
        title: deliveryTitle(delivery.integration, delivery.status),
        detail: parts.length ? parts.join(" · ") : undefined,
        tone: toneFromStatus(delivery.status),
      });
    }
  }

  return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
