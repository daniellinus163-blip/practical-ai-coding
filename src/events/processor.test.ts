import assert from "node:assert/strict";
import test from "node:test";
import { createAdapters } from "./adapters.ts";
import type { IntegrationConfig } from "./config.ts";
import { integrationsFor } from "./config.ts";
import { processOneEvent, type EventStore } from "./processor.ts";
import type { AutomationEvent, ContactContext, DeliveryResult, DeliveryRow, IntegrationName } from "./types.ts";

const inquiryId = "11111111-1111-4111-8111-111111111111";
const leadId = "22222222-2222-4222-8222-222222222222";

function baseEvent(over: Partial<AutomationEvent> = {}): AutomationEvent {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    event_type: "inquiry.received",
    entity_type: "inquiry",
    entity_id: inquiryId,
    lead_id: leadId,
    payload: { inquiry_id: inquiryId, lead_id: leadId, vehicle_slug: "aston-martin-valkyrie", has_config: false },
    status: "processing",
    attempt_count: 1,
    max_attempts: 8,
    next_attempt_at: new Date().toISOString(),
    last_error: null,
    idempotency_key: `inquiry.received:${inquiryId}`,
    created_at: new Date().toISOString(),
    ...over,
  };
}

function memoryStore(): EventStore & { deliveries: DeliveryRow[]; completed: Array<string>; failedEvents: number } {
  const deliveries: DeliveryRow[] = [];
  const completed: string[] = [];
  return {
    deliveries,
    completed,
    failedEvents: 0,
    claim: async () => [],
    complete: async (id, status) => {
      completed.push(`${id}:${status}`);
    },
    listDeliveries: async (eventId) => deliveries.filter((row) => row.event_id === eventId),
    upsertDelivery: async (eventId, integration, result) => {
      const index = deliveries.findIndex((row) => row.event_id === eventId && row.integration === integration);
      const row: DeliveryRow = {
        event_id: eventId,
        integration,
        status: result.status,
        attempt_count: index >= 0 ? deliveries[index].attempt_count + 1 : 1,
        retryable: result.retryable,
        last_error: result.error ?? null,
        external_id: result.externalId ?? null,
      };
      if (index >= 0) deliveries[index] = row;
      else deliveries.push(row);
    },
    loadContact: async () => ({
      email: "buyer@example.com",
      name: "Buyer",
      leadId,
      inquiryId,
      vehicleSlug: "aston-martin-valkyrie",
      leadStatus: "new",
    }),
    enqueueDeliveryFailed: async () => {
      (memoryStore as unknown as { failedEvents?: number }).failedEvents;
    },
  };
}

const emptyConfig = (): IntegrationConfig => ({
  dryRun: false,
  siteUrl: "http://localhost:3000",
  workerSecret: "worker",
  workerSecrets: ["worker"],
  webhookSecret: "hook",
  n8nWebhookUrl: "",
  n8nSecret: "",
  hubspotToken: "",
  hubspotPipelineId: "",
  hubspotStages: {},
  resendApiKey: "",
  resendFrom: "",
  resendInternalTo: "",
});

test("missing credentials skip instead of succeeding", async () => {
  const store = memoryStore();
  const adapters = createAdapters({
    config: emptyConfig(),
    mappings: { get: async () => null, put: async () => {} },
    internal: { ensureFollowUpTask: async () => "task-1" },
    fetchImpl: async () => new Response("should not run", { status: 500 }),
  });
  await processOneEvent({ store, deliver: adapters.deliver, config: emptyConfig(), event: baseEvent() });
  assert.ok(store.completed[0]?.endsWith(":succeeded"));
  assert.ok(store.deliveries.every((row) => row.integration === "internal" || row.status === "skipped"));
});

test("temporary provider failure stays retryable and does not mark success", async () => {
  const store = memoryStore();
  let calls = 0;
  const deliver = async (integration: IntegrationName): Promise<DeliveryResult> => {
    if (integration === "hubspot") {
      calls += 1;
      return { status: "failed", retryable: true, error: "http_503" };
    }
    return { status: "skipped", retryable: false, error: "not_configured" };
  };
  await processOneEvent({ store, deliver, config: emptyConfig(), event: baseEvent() });
  assert.equal(store.completed[0], `${baseEvent().id}:failed`);
  assert.equal(calls, 1);
});

test("successful retry does not re-send succeeded integrations", async () => {
  const store = memoryStore();
  store.deliveries.push({
    event_id: baseEvent().id,
    integration: "hubspot",
    status: "succeeded",
    attempt_count: 1,
    retryable: false,
    last_error: null,
    external_id: "contact:1;deal:2",
  });
  const sent: string[] = [];
  const deliver = async (integration: IntegrationName): Promise<DeliveryResult> => {
    sent.push(integration);
    return { status: "succeeded", retryable: false, externalId: integration };
  };
  await processOneEvent({ store, deliver, config: emptyConfig(), event: baseEvent() });
  assert.equal(sent.includes("hubspot"), false);
  assert.equal(sent.includes("n8n"), false);
  assert.ok(sent.includes("resend"));
  assert.ok(sent.includes("resend_staff"));
});

test("dry-run does not call providers", async () => {
  const config = {
    ...emptyConfig(),
    dryRun: true,
    n8nWebhookUrl: "https://n8n.example/hook",
    n8nSecret: "s",
    resendApiKey: "re_test",
    resendFrom: "onboarding@resend.dev",
    resendInternalTo: "staff@example.com",
  };
  let called = 0;
  const adapters = createAdapters({
    config,
    mappings: { get: async () => null, put: async () => {} },
    internal: { ensureFollowUpTask: async () => "task-1" },
    fetchImpl: async () => {
      called += 1;
      return new Response("nope", { status: 200 });
    },
  });
  const store = memoryStore();
  await processOneEvent({ store, deliver: adapters.deliver, config, event: baseEvent() });
  assert.equal(called, 0);
  assert.equal(store.deliveries.some((row) => row.integration === "n8n"), false);
  assert.equal(store.deliveries.find((row) => row.integration === "resend")?.last_error, "dry_run");
  assert.equal(store.deliveries.find((row) => row.integration === "resend_staff")?.last_error, "dry_run");
});

test("n8n is not called for an inquiry", async () => {
  let called = 0;
  const adapters = createAdapters({
    config: { ...emptyConfig(), n8nWebhookUrl: "https://n8n.example/hook", n8nSecret: "shared", hubspotToken: "pat" },
    mappings: { get: async () => null, put: async () => {} },
    internal: { ensureFollowUpTask: async () => "task-1" },
    fetchImpl: async (input) => {
      called += 1;
      assert.equal(String(input).includes("n8n.example"), false);
      return new Response(JSON.stringify({ results: [{ id: "C1" }], id: "D1" }), { status: 200 });
    },
  });
  const skipped = await adapters.deliver("n8n", baseEvent(), {} as ContactContext);
  assert.equal(skipped.status, "skipped");
  assert.equal(skipped.error, "n8n_not_used");
  assert.equal(called, 0);
});

test("HubSpot retries reuse mapped ids", async () => {
  const config = { ...emptyConfig(), hubspotToken: "pat" };
  const map = new Map<string, string>([["hubspot:contact:lead:" + leadId, "C1"]]);
  let dealCreates = 0;
  const adapters = createAdapters({
    config,
    mappings: {
      get: async (provider, object, localType, localId) => map.get(`${provider}:${object}:${localType}:${localId}`) ?? null,
      put: async (provider, object, localType, localId, providerId) => {
        map.set(`${provider}:${object}:${localType}:${localId}`, providerId);
      },
    },
    internal: { ensureFollowUpTask: async () => "task-1" },
    fetchImpl: async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("/contacts/batch/upsert")) {
        return new Response(JSON.stringify({ results: [{ id: "C1" }] }), { status: 200 });
      }
      if (url.includes("/deals") && method === "POST") {
        dealCreates += 1;
        return new Response(JSON.stringify({ id: "D1" }), { status: 200 });
      }
      if (url.includes("/deals/D1") && method === "PATCH") {
        return new Response(JSON.stringify({ id: "D1" }), { status: 200 });
      }
      return new Response("no", { status: 404 });
    },
  });
  const contact: ContactContext = {
    email: "buyer@example.com",
    name: "Buyer",
    leadId,
    inquiryId,
    vehicleSlug: "valkyrie",
    leadStatus: "new",
  };
  const first = await adapters.deliver("hubspot", baseEvent(), contact);
  map.set("hubspot:deal:inquiry:" + inquiryId, "D1");
  const second = await adapters.deliver("hubspot", baseEvent(), contact);
  assert.equal(first.status, "succeeded");
  assert.equal(second.status, "succeeded");
  assert.equal(dealCreates, 1);
});

test("HubSpot stage update failure is not treated as success", async () => {
  const config = {
    ...emptyConfig(),
    hubspotToken: "pat",
    hubspotPipelineId: "default",
    hubspotStages: { new: "appointmentscheduled" },
  };
  const adapters = createAdapters({
    config,
    mappings: {
      get: async (provider, object) => (object === "deal" ? "D1" : provider === "hubspot" ? "C1" : null),
      put: async () => {},
    },
    internal: { ensureFollowUpTask: async () => "task-1" },
    fetchImpl: async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("/contacts/batch/upsert")) {
        return new Response(JSON.stringify({ results: [{ id: "C1" }] }), { status: 200 });
      }
      if (url.includes("/deals/D1") && method === "PATCH") {
        return new Response(JSON.stringify({ message: "bad stage" }), { status: 400 });
      }
      return new Response("no", { status: 404 });
    },
  });
  const result = await adapters.deliver("hubspot", baseEvent(), {
    email: "buyer@example.com",
    name: "Buyer",
    leadId,
    inquiryId,
    vehicleSlug: "valkyrie",
    leadStatus: "new",
  });
  assert.equal(result.status, "failed");
  assert.equal(result.retryable, false);
});

test("Resend duplicate prevention is delivery status, not a second send", async () => {
  const config = {
    ...emptyConfig(),
    resendApiKey: "re_test",
    resendFrom: "studio@example.com",
  };
  let sends = 0;
  const adapters = createAdapters({
    config,
    mappings: { get: async () => null, put: async () => {} },
    internal: { ensureFollowUpTask: async () => "task-1" },
    fetchImpl: async (input) => {
      if (String(input).includes("resend.com")) {
        sends += 1;
        return new Response(JSON.stringify({ id: "msg_1" }), { status: 200 });
      }
      return new Response("no", { status: 404 });
    },
  });
  const store = memoryStore();
  await processOneEvent({ store, deliver: adapters.deliver, config, event: baseEvent() });
  await processOneEvent({ store, deliver: adapters.deliver, config, event: baseEvent() });
  assert.equal(sends, 1);
});

test("invalid payloads are dead-lettered", async () => {
  const store = memoryStore();
  await processOneEvent({
    store,
    deliver: async () => ({ status: "succeeded", retryable: false }),
    config: emptyConfig(),
    event: baseEvent({ payload: { vehicle_slug: "x" } }),
  });
  assert.equal(store.completed[0]?.endsWith(":dead"), true);
});

test("inquiry events go to the app worker, HubSpot, and optional Resend", () => {
  assert.deepEqual(integrationsFor("inquiry.received"), ["internal", "hubspot", "resend", "resend_staff"]);
  assert.deepEqual(integrationsFor("lead.stage_changed"), ["hubspot"]);
  assert.deepEqual(integrationsFor("follow_up.reminder"), ["internal", "resend"]);
  assert.deepEqual(integrationsFor("configuration.saved"), []);
});

function resendConfig(over: Partial<IntegrationConfig> = {}): IntegrationConfig {
  return {
    ...emptyConfig(),
    hubspotToken: "pat",
    resendApiKey: "re_test",
    resendFrom: "onboarding@resend.dev",
    resendInternalTo: "staff@example.com",
    ...over,
  };
}

function mailResponse(input: RequestInfo | URL, init?: RequestInit) {
  const url = String(input);
  if (url.includes("api.hubapi.com")) {
    return new Response(JSON.stringify({ results: [{ id: "C1" }], id: "D1" }), { status: 200 });
  }
  if (!url.includes("api.resend.com")) return new Response("no", { status: 404 });
  const body = JSON.parse(String(init?.body ?? "{}")) as { to?: string[] };
  const recipient = body.to?.[0] ?? "";
  if (recipient === "buyer@example.com") {
    return new Response(
      JSON.stringify({
        message: "You can only send testing emails to your own email address (owner@resend.dev).",
      }),
      { status: 403 },
    );
  }
  if (recipient === "staff@example.com") {
    return new Response(JSON.stringify({ id: "msg_staff" }), { status: 200 });
  }
  return new Response(JSON.stringify({ message: "The domain is not verified." }), { status: 403 });
}

test("customer email failure still attempts the staff notification", async () => {
  const config = resendConfig();
  const calls: string[] = [];
  const adapters = createAdapters({
    config,
    mappings: { get: async () => null, put: async () => {} },
    internal: { ensureFollowUpTask: async () => "task-1" },
    fetchImpl: async (input, init) => {
      calls.push(String(input));
      return mailResponse(input, init);
    },
  });
  const store = memoryStore();
  await processOneEvent({ store, deliver: adapters.deliver, config, event: baseEvent() });
  assert.equal(store.deliveries.find((row) => row.integration === "hubspot")?.status, "succeeded");
  assert.equal(store.deliveries.find((row) => row.integration === "resend")?.status, "failed");
  assert.equal(store.deliveries.find((row) => row.integration === "resend")?.last_error, "resend_recipient_not_permitted");
  assert.equal(store.deliveries.find((row) => row.integration === "resend_staff")?.status, "succeeded");
  assert.equal(store.completed[0]?.endsWith(":failed"), true);
  assert.equal(calls.filter((url) => url.includes("api.resend.com")).length, 2);
  assert.equal(store.deliveries.find((row) => row.integration === "resend")?.last_error?.includes("owner@resend.dev"), false);
});

test("both customer and staff email failures stay separate", async () => {
  const config = resendConfig();
  const adapters = createAdapters({
    config,
    mappings: { get: async () => null, put: async () => {} },
    internal: { ensureFollowUpTask: async () => "task-1" },
    fetchImpl: async (input, init) => {
      const url = String(input);
      if (url.includes("api.hubapi.com")) {
        return new Response(JSON.stringify({ results: [{ id: "C1" }], id: "D1" }), { status: 200 });
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as { to?: string[] };
      if (body.to?.[0] === "buyer@example.com") {
        return new Response(JSON.stringify({ message: "The example.com domain is not verified." }), { status: 403 });
      }
      return new Response(JSON.stringify({ message: "unavailable" }), { status: 503 });
    },
  });
  const store = memoryStore();
  await processOneEvent({ store, deliver: adapters.deliver, config, event: baseEvent() });
  assert.equal(store.deliveries.find((row) => row.integration === "hubspot")?.status, "succeeded");
  assert.equal(store.deliveries.find((row) => row.integration === "resend")?.last_error, "resend_domain_not_verified");
  assert.equal(store.deliveries.find((row) => row.integration === "resend")?.retryable, false);
  assert.equal(store.deliveries.find((row) => row.integration === "resend_staff")?.status, "failed");
  assert.equal(store.deliveries.find((row) => row.integration === "resend_staff")?.retryable, true);
  assert.equal(store.completed[0]?.endsWith(":failed"), true);
});

test("missing Resend configuration skips both emails without calling Resend", async () => {
  let called = 0;
  const adapters = createAdapters({
    config: emptyConfig(),
    mappings: { get: async () => null, put: async () => {} },
    internal: { ensureFollowUpTask: async () => "task-1" },
    fetchImpl: async () => {
      called += 1;
      return new Response("no", { status: 500 });
    },
  });
  const store = memoryStore();
  await processOneEvent({ store, deliver: adapters.deliver, config: emptyConfig(), event: baseEvent() });
  assert.equal(called, 0);
  assert.equal(store.deliveries.find((row) => row.integration === "resend")?.last_error, "resend_not_configured");
  assert.equal(store.deliveries.find((row) => row.integration === "resend_staff")?.last_error, "resend_not_configured");
  assert.equal(store.completed[0]?.endsWith(":succeeded"), true);
});

test("retry does not resend an email that already succeeded", async () => {
  const config = resendConfig();
  const sentTo: string[] = [];
  const adapters = createAdapters({
    config,
    mappings: { get: async () => null, put: async () => {} },
    internal: { ensureFollowUpTask: async () => "task-1" },
    fetchImpl: async (input, init) => {
      const url = String(input);
      if (url.includes("api.hubapi.com")) {
        return new Response(JSON.stringify({ results: [{ id: "C1" }], id: "D1" }), { status: 200 });
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as { to?: string[] };
      sentTo.push(body.to?.[0] ?? "");
      if (body.to?.[0] === "buyer@example.com") {
        return new Response(JSON.stringify({ message: "unavailable" }), { status: 503 });
      }
      return new Response(JSON.stringify({ id: "msg_staff" }), { status: 200 });
    },
  });
  const store = memoryStore();
  await processOneEvent({ store, deliver: adapters.deliver, config, event: baseEvent() });
  await processOneEvent({ store, deliver: adapters.deliver, config, event: { ...baseEvent(), attempt_count: 2 } });
  assert.deepEqual(sentTo, ["buyer@example.com", "staff@example.com", "buyer@example.com"]);
  assert.equal(store.deliveries.find((row) => row.integration === "resend_staff")?.status, "succeeded");
  assert.equal(store.deliveries.find((row) => row.integration === "hubspot")?.status, "succeeded");
});

function followUpEvent(over: Partial<AutomationEvent> = {}): AutomationEvent {
  return baseEvent({
    event_type: "follow_up.reminder",
    idempotency_key: `follow_up.reminder:${inquiryId}`,
    ...over,
  });
}

test("a failed follow-up email is not marked delivered", async () => {
  const config = resendConfig({ dryRun: false });
  let sends = 0;
  const adapters = createAdapters({
    config,
    mappings: { get: async () => null, put: async () => {} },
    internal: { ensureFollowUpTask: async () => "task-1" },
    fetchImpl: async (input) => {
      if (String(input).includes("api.resend.com")) {
        sends += 1;
        return new Response(JSON.stringify({ message: "unavailable" }), { status: 503 });
      }
      return new Response("no", { status: 404 });
    },
  });
  const store = memoryStore();
  await processOneEvent({ store, deliver: adapters.deliver, config, event: followUpEvent() });
  assert.equal(sends, 1);
  assert.equal(store.deliveries.find((row) => row.integration === "resend")?.status, "failed");
  assert.equal(store.deliveries.find((row) => row.integration === "resend")?.retryable, true);
  assert.equal(store.deliveries.some((row) => row.integration === "hubspot"), false);
  assert.equal(store.completed[0]?.endsWith(":succeeded"), false);
  assert.equal(store.completed[0]?.endsWith(":failed"), true);
});

test("a delivered follow-up email is not sent again", async () => {
  const config = resendConfig({ dryRun: false });
  let sends = 0;
  const adapters = createAdapters({
    config,
    mappings: { get: async () => null, put: async () => {} },
    internal: { ensureFollowUpTask: async () => "task-1" },
    fetchImpl: async (input) => {
      if (String(input).includes("api.resend.com")) {
        sends += 1;
        return new Response(JSON.stringify({ id: "msg_follow" }), { status: 200 });
      }
      return new Response("no", { status: 404 });
    },
  });
  const store = memoryStore();
  await processOneEvent({ store, deliver: adapters.deliver, config, event: followUpEvent() });
  await processOneEvent({ store, deliver: adapters.deliver, config, event: followUpEvent({ attempt_count: 2 }) });
  assert.equal(sends, 1);
  assert.equal(store.deliveries.find((row) => row.integration === "resend")?.status, "succeeded");
  assert.equal(store.completed.at(-1)?.endsWith(":succeeded"), true);
});
