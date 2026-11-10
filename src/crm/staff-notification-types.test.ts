import assert from "node:assert/strict";
import test from "node:test";
import { notificationHref } from "@/crm/staff-notification-types";

test("notificationHref prefers explicit href", () => {
  assert.equal(notificationHref({ href: "/staff/events", lead_id: "a", automation_event_id: "b" }), "/staff/events");
});

test("notificationHref falls back to lead", () => {
  assert.equal(
    notificationHref({ href: null, lead_id: "8abf74ac-1134-4b7a-97cc-b1ca3896c806", automation_event_id: null }),
    "/staff/leads/8abf74ac-1134-4b7a-97cc-b1ca3896c806",
  );
});
