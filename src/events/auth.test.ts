import assert from "node:assert/strict";
import test from "node:test";
import { canRetryEvents, canViewIntegrations, workerAuthorized } from "./auth.ts";
import { signPayload, verifySignature } from "./signature.ts";
import { safeLogMessage } from "./log.ts";
import { sanitizePayload, validateEventPayload } from "./payload.ts";

test("worker rejects missing and wrong secrets", () => {
  const request = new Request("http://localhost/api/internal/events/process", {
    headers: { authorization: "Bearer wrong" },
  });
  assert.equal(workerAuthorized(request, ""), false);
  assert.equal(workerAuthorized(request, "correct"), false);
  assert.equal(workerAuthorized(request, ["events-secret", "cron-secret"]), false);
  const ok = new Request("http://localhost/api/internal/events/process", {
    headers: { authorization: "Bearer correct" },
  });
  assert.equal(workerAuthorized(ok, "correct"), true);
  assert.equal(workerAuthorized(ok, ["events-secret", "correct"]), true);
  const query = new Request("http://localhost/api/internal/events/process?secret=correct");
  assert.equal(workerAuthorized(query, "correct"), false);
});

test("dashboard retries are admin-only", () => {
  assert.equal(canViewIntegrations("staff"), true);
  assert.equal(canRetryEvents("staff"), false);
  assert.equal(canRetryEvents("admin"), true);
  assert.equal(canRetryEvents(null), false);
});

test("webhook signatures reject invalid headers", () => {
  const body = '{"event_id":"1"}';
  const secret = "webhook-secret";
  const good = signPayload(secret, body);
  assert.equal(verifySignature(secret, body, `sha256=${good}`), true);
  assert.equal(verifySignature(secret, body, "sha256=deadbeef"), false);
  assert.equal(verifySignature(secret, body, null), false);
});

test("payloads drop secrets and emails", () => {
  const clean = sanitizePayload({
    inquiry_id: "11111111-1111-4111-8111-111111111111",
    email: "person@example.com",
    password: "nope",
    token: "abc",
    vehicle_slug: "valkyrie",
  });
  assert.equal("email" in clean, false);
  assert.equal("password" in clean, false);
  assert.equal(clean.vehicle_slug, "valkyrie");
});

test("invalid event payloads are rejected", () => {
  assert.ok(validateEventPayload("inquiry.received", { vehicle_slug: "x" }));
  assert.equal(
    validateEventPayload("inquiry.received", {
      inquiry_id: "11111111-1111-4111-8111-111111111111",
      lead_id: "22222222-2222-4222-8222-222222222222",
    }),
    null,
  );
});

test("logs never keep emails or bearer tokens", () => {
  const message = safeLogMessage("user person@example.com Bearer abcdef.token");
  assert.equal(message.includes("person@"), false);
  assert.equal(message.includes("abcdef"), false);
});
