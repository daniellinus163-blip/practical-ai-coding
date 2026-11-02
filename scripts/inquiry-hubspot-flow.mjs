import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createAdapters } from "../src/events/adapters.ts";
import { loadIntegrationConfig } from "../src/events/config.ts";
import { safeLogMessage } from "../src/events/log.ts";
import { processOneEvent } from "../src/events/processor.ts";
import { createInternalStore, createSupabaseEventStore, createSupabaseMappings } from "../src/events/supabase-store.ts";

function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index < 1 || line.startsWith("#")) continue;
    const key = line.slice(0, index).trim();
    if (process.env[key]) continue;
    process.env[key] = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
if (!url || !serviceKey || !hubspotToken) {
  console.log(JSON.stringify({ ok: false, step: "env", missingServiceRole: !serviceKey, missingHubspot: !hubspotToken }));
  process.exit(1);
}

const stamp = Date.now();
const email = `formshift-flow-${stamp}@example.com`;
const vehicleSlug = `formshift-flow-${stamp}`;
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await admin.rpc("record_inquiry", {
  p_name: "FormShift Flow Test",
  p_email: email,
  p_message: "Automated inquiry-to-HubSpot flow test. Not a customer order.",
  p_vehicle_slug: vehicleSlug,
  p_configuration_id: null,
  p_configuration_snapshot: null,
  p_submission_hash: `phase8-flow-${stamp}`,
  p_user_id: null,
});

if (error || !data?.event_id) {
  console.log(JSON.stringify({ ok: false, step: "record_inquiry", error: safeLogMessage(error?.message ?? "no_event") }));
  process.exit(1);
}

const config = loadIntegrationConfig();
const store = createSupabaseEventStore(admin);
const adapters = createAdapters({
  config,
  mappings: createSupabaseMappings(admin),
  internal: createInternalStore(admin),
});

const { data: eventRow, error: eventError } = await admin
  .from("automation_events")
  .select("id, event_type, entity_type, entity_id, lead_id, payload, status, attempt_count, max_attempts, next_attempt_at, last_error, idempotency_key, created_at")
  .eq("id", data.event_id)
  .single();

if (eventError || !eventRow) {
  console.log(JSON.stringify({ ok: false, step: "load_event", error: safeLogMessage(eventError?.message ?? "missing") }));
  process.exit(1);
}

await processOneEvent({ store, deliver: adapters.deliver, config, event: eventRow });
await processOneEvent({ store, deliver: adapters.deliver, config, event: eventRow });

const [{ data: eventAfter }, { data: deliveries }] = await Promise.all([
  admin.from("automation_events").select("status, attempt_count, last_error").eq("id", data.event_id).single(),
  admin.from("automation_event_deliveries").select("integration, status, external_id, last_error, attempt_count").eq("event_id", data.event_id),
]);

const contactSearch = await hubspotSearch("contacts", "email", email);
const dealSearch = await hubspotSearch("deals", "dealname", `FormShift inquiry ${vehicleSlug}`);

console.log(
  JSON.stringify({
    ok: eventAfter?.status === "succeeded" && contactSearch.count === 1 && dealSearch.count === 1,
    inquiryId: data.inquiry_id,
    leadId: data.lead_id,
    eventId: data.event_id,
    eventStatus: eventAfter?.status ?? null,
    eventError: eventAfter?.last_error ? safeLogMessage(eventAfter.last_error) : null,
    deliveries: (deliveries ?? []).map((row) => ({
      integration: row.integration,
      status: row.status,
      attempts: row.attempt_count,
      externalId: row.external_id,
      error: row.last_error ? safeLogMessage(row.last_error) : null,
    })),
    hubspotContacts: contactSearch.count,
    hubspotContactIds: contactSearch.ids,
    hubspotDeals: dealSearch.count,
    hubspotDealIds: dealSearch.ids,
    hubspotSearchStatus: { contacts: contactSearch.status, deals: dealSearch.status },
    recordsModified: true,
    testEmail: email,
  }),
);

async function hubspotSearch(object, property, value) {
  const response = await fetch(`https://api.hubapi.com/crm/v3/objects/${object}/search`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${hubspotToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: property, operator: "EQ", value }] }],
      limit: 10,
    }),
  });
  const json = await response.json().catch(() => null);
  const ids = Array.isArray(json?.results) ? json.results.map((row) => row.id).filter((id) => typeof id === "string") : [];
  return { status: response.status, count: ids.length, ids };
}
