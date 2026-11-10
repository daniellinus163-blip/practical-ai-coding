/**
 * Phase 12 scenario map — links product workflows to automated tests (mocked externals).
 * This file does not call HubSpot, Resend, or a live Supabase project.
 */
import assert from "node:assert/strict";
import { createAdapters } from "@/events/adapters";
import { processOneEvent } from "@/events/processor";
import type { IntegrationConfig } from "@/events/config";
import type { AutomationEvent, ContactContext, DeliveryRow, IntegrationName } from "@/events/types";
import { describe, it } from "node:test";

const inquiryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const leadId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const SCENARIO_COVERAGE: Record<number, { automated: string[]; manual: string }> = {
  1: {
    automated: ["inquiries/access.test.ts", "submitInquiryAction → record_inquiry RPC"],
    manual: "Submit form in browser against configured Supabase.",
  },
  2: {
    automated: ["record_inquiry SQL in phase7 migration", "access.test.ts ordering"],
    manual: "Confirm row in Supabase Table Editor after submit.",
  },
  3: {
    automated: ["staff_notifications migration + bell Realtime subscription (code review)"],
    manual: "Two browsers: submit inquiry, watch bell without refresh (Realtime + RLS).",
  },
  4: {
    automated: ["staff-notification-types.test.ts notificationHref"],
    manual: "Click notification → correct /staff/leads/[id].",
  },
  5: {
    automated: ["configuration-summary.ts", "lead detail page compose"],
    manual: "Visual check vehicle + config panel on lead.",
  },
  6: {
    automated: ["sendCustomerFollowUpAction + record activity"],
    manual: "Send reply in UI with service role configured.",
  },
  7: {
    automated: ["processor.test.ts customer/staff email independence", "lead-conversation emailDeliveryLabel"],
    manual: "Verify delivery row in automation_event_deliveries after worker.",
  },
  8: {
    automated: ["lead_activities insert on reply", "build-lead-timeline.test.ts"],
    manual: "Activity list on lead after reply.",
  },
  9: {
    automated: ["processor.test.ts HubSpot upsert", "hubspot-sync-status.test.ts"],
    manual: "Live HubSpot with token + worker run; confirm mapping rows.",
  },
  10: {
    automated: ["processor.test.ts duplicate deal PATCH", "record_lead_stage_changed RPC"],
    manual: "Change stage in UI; verify single deal in HubSpot.",
  },
  11: {
    automated: ["task-reminders.test.ts", "follow-up reminder claim test in processor.test.ts"],
    manual: "Vercel cron + CRON_SECRET; or Integrations → Process queued events now.",
  },
  12: {
    automated: ["integration-monitoring loader", "retry_automation_event SQL", "events/actions retry"],
    manual: "Force failed delivery; retry from Monitoring page as admin.",
  },
  13: {
    automated: ["security-review.test.ts", "events/auth.test.ts", "worker-http.test.ts"],
    manual: "Logged-out / non-staff user hits /staff → login or staff-denied.",
  },
};

describe("Phase 12 workflow scenario map", () => {
  for (const [n, row] of Object.entries(SCENARIO_COVERAGE)) {
    it(`scenario ${n} has documented coverage`, () => {
      assert.ok(row.automated.length > 0);
      assert.ok(row.manual.length > 10);
    });
  }
});

describe("mocked inquiry pipeline (no live CRM/email)", () => {
  const config: IntegrationConfig = {
    dryRun: false,
    siteUrl: "http://localhost:3000",
    workerSecret: "test",
    workerSecrets: ["test"],
    webhookSecret: "hook",
    n8nWebhookUrl: "",
    n8nSecret: "",
    hubspotToken: "pat-test",
    hubspotPipelineId: "default",
    hubspotStages: { new: "stage-new" },
    resendApiKey: "re_test",
    resendFrom: "studio@example.com",
    resendInternalTo: "staff@example.com",
  };

  it("processes inquiry.received with independent delivery outcomes", async () => {
    const deliveries: DeliveryRow[] = [];
    const completed: Array<string> = [];

    const event: AutomationEvent = {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      event_type: "inquiry.received",
      entity_type: "inquiry",
      entity_id: inquiryId,
      lead_id: leadId,
      payload: { inquiry_id: inquiryId, lead_id: leadId, vehicle_slug: "test-car", has_config: true },
      status: "processing",
      attempt_count: 1,
      max_attempts: 8,
      next_attempt_at: new Date().toISOString(),
      last_error: null,
      idempotency_key: `inquiry.received:${inquiryId}`,
      created_at: new Date().toISOString(),
    };

    const contact: ContactContext = {
      email: "customer@example.com",
      name: "Customer",
      leadId,
      inquiryId,
      vehicleSlug: "test-car",
      leadStatus: "new",
      message: "Hello",
      staffReplyBody: null,
      configurationSummary: "Make: Test",
    };

    const adapters = createAdapters({
      config,
      mappings: { get: async () => null, put: async () => {} },
      internal: { ensureFollowUpTask: async () => "task-1" },
      fetchImpl: async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (url.includes("hubapi.com") && url.includes("contacts")) {
          return new Response(JSON.stringify({ results: [{ id: "9001" }] }), { status: 200 });
        }
        if (url.includes("hubapi.com") && method === "POST" && url.includes("/deals")) {
          return new Response(JSON.stringify({ id: "8002" }), { status: 200 });
        }
        if (url.includes("resend.com")) {
          const body = JSON.parse(String(init?.body ?? "{}")) as { to?: string[] };
          const to = body.to?.[0] ?? "";
          if (to === "customer@example.com") {
            return new Response(JSON.stringify({ message: "not allowed" }), { status: 403 });
          }
          return new Response(JSON.stringify({ id: "msg_staff" }), { status: 200 });
        }
        return new Response("no", { status: 404 });
      },
    });

    const store = {
      deliveries,
      completed,
      claim: async () => [],
      complete: async (id: string, status: string) => {
        completed.push(`${id}:${status}`);
      },
      listDeliveries: async () => deliveries,
      upsertDelivery: async (eventId: string, integration: IntegrationName, result) => {
        deliveries.push({
          event_id: eventId,
          integration,
          status: result.status,
          attempt_count: 1,
          retryable: result.retryable,
          last_error: result.error ?? null,
          external_id: result.externalId ?? null,
        });
      },
      loadContact: async () => contact,
      enqueueDeliveryFailed: async () => undefined,
    };

    await processOneEvent({ store, deliver: adapters.deliver, config, event });

    const customer = deliveries.find((d) => d.integration === "resend");
    const staff = deliveries.find((d) => d.integration === "resend_staff");
    const hubspot = deliveries.find((d) => d.integration === "hubspot");

    assert.equal(customer?.status, "failed");
    assert.equal(staff?.status, "succeeded");
    assert.equal(hubspot?.status, "succeeded");
    assert.equal(completed[0], `${event.id}:succeeded`);
  });
});
