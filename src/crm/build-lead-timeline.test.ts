import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLeadTimeline } from "@/crm/build-lead-timeline";

describe("build-lead-timeline", () => {
  it("orders events and labels resend success as api accepted", () => {
    const eventId = "11111111-1111-1111-1111-111111111111";
    const deliveryId = "22222222-2222-2222-2222-222222222222";
    const items = buildLeadTimeline({
      inquirySubmittedAt: "2026-01-01T10:00:00.000Z",
      events: [
        {
          id: eventId,
          event_type: "inquiry.received",
          status: "succeeded",
          attempt_count: 1,
          last_error: null,
          created_at: "2026-01-01T10:00:01.000Z",
          completed_at: "2026-01-01T10:00:05.000Z",
          next_attempt_at: null,
        },
      ],
      deliveries: [
        {
          id: deliveryId,
          event_id: eventId,
          integration: "resend",
          status: "succeeded",
          attempt_count: 1,
          last_error: null,
          external_id: "re_123",
          completed_at: "2026-01-01T10:00:04.000Z",
          updated_at: "2026-01-01T10:00:04.000Z",
        },
      ],
    });
    const resendLine = items.find((i) => i.id === `delivery-${deliveryId}`);
    assert.ok(resendLine?.title.includes("API accepted"));
    assert.ok(resendLine?.detail?.includes("not proof of inbox delivery"));
    assert.equal(items[0].title, "Inquiry received on website");
  });
});
