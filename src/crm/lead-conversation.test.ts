import assert from "node:assert/strict";
import test from "node:test";
import { buildConversationMessages, emailDeliveryLabel } from "@/crm/lead-conversation";

test("emailDeliveryLabel never claims inbox delivery on succeeded", () => {
  const label = emailDeliveryLabel({ status: "succeeded" });
  assert.ok(label?.includes("accepted by Resend"));
  assert.ok(!label?.toLowerCase().includes("delivered to inbox"));
});

test("conversation separates staff outbound", () => {
  const rows = buildConversationMessages(
    [
      {
        id: "1",
        kind: "inquiry_received",
        body: "Hello",
        created_at: "2026-01-01T00:00:00Z",
        actor_user_id: null,
        meta: null,
      },
      {
        id: "2",
        kind: "customer_follow_up",
        body: "Reply",
        created_at: "2026-01-02T00:00:00Z",
        actor_user_id: "staff-1",
        meta: { email: { status: "failed", error: "resend_recipient_not_permitted" } },
      },
    ],
    new Map([["staff-1", "Alex"]]),
    "Customer",
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1].direction, "staff");
  assert.equal(rows[1].emailDelivery?.status, "failed");
});
