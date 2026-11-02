import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createAdapters } from "../src/events/adapters.ts";
import { loadIntegrationConfig } from "../src/events/config.ts";
import { safeLogMessage } from "../src/events/log.ts";

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
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const token = process.env.HUBSPOT_ACCESS_TOKEN;
const stamp = Date.now();
const email = `formshift-flow-${stamp}@example.com`;
const vehicleSlug = `formshift-flow-${stamp}`;
const inquiryId = "11111111-1111-4111-8111-111111111111";
const leadId = "22222222-2222-4222-8222-222222222222";

const client = url && anon ? createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
let recorded = null;
let recordError = null;
if (client) {
  const result = await client.rpc("record_inquiry", {
    p_name: "FormShift Flow Test",
    p_email: email,
    p_message: "Automated inquiry-to-HubSpot flow test. Not a customer order.",
    p_vehicle_slug: vehicleSlug,
    p_configuration_id: null,
    p_configuration_snapshot: null,
    p_submission_hash: `phase8-flow-${stamp}`,
    p_user_id: null,
  });
  recorded = result.data;
  recordError = result.error ? safeLogMessage(result.error.message) : null;
}

const map = new Map();
const config = loadIntegrationConfig();
const adapters = createAdapters({
  config,
  mappings: {
    get: async (provider, object, localType, localId) => map.get(`${provider}:${object}:${localType}:${localId}`) ?? null,
    put: async (provider, object, localType, localId, providerId) => {
      map.set(`${provider}:${object}:${localType}:${localId}`, providerId);
    },
  },
  internal: { ensureFollowUpTask: async () => "local-task" },
});

const event = {
  id: "33333333-3333-4333-8333-333333333333",
  event_type: "inquiry.received",
  entity_type: "inquiry",
  entity_id: recorded?.inquiry_id ?? inquiryId,
  lead_id: recorded?.lead_id ?? leadId,
  payload: {
    inquiry_id: recorded?.inquiry_id ?? inquiryId,
    lead_id: recorded?.lead_id ?? leadId,
    vehicle_slug: vehicleSlug,
    has_config: false,
  },
  status: "processing",
  attempt_count: 1,
  max_attempts: 8,
  next_attempt_at: new Date().toISOString(),
  last_error: null,
  idempotency_key: "inquiry.received:test",
  created_at: new Date().toISOString(),
};
const contact = {
  email,
  name: "FormShift Flow Test",
  leadId: event.lead_id,
  inquiryId: event.entity_id,
  vehicleSlug,
  leadStatus: "new",
};

const first = await adapters.deliver("hubspot", event, contact);
const second = await adapters.deliver("hubspot", event, contact);
const contacts = await search("contacts", "email", email);
const deals = await search("deals", "dealname", `FormShift inquiry ${vehicleSlug}`);
const removed = await removeTestRecords(first.externalId, deals.ids);

console.log(
  JSON.stringify({
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    inquirySaved: Boolean(recorded?.inquiry_id),
    inquiryDuplicate: recorded?.duplicate ?? null,
    recordError,
    inquiryId: recorded?.inquiry_id ?? null,
    leadId: recorded?.lead_id ?? null,
    eventId: recorded?.event_id ?? null,
    firstStatus: first.status,
    firstError: first.error ? safeLogMessage(first.error) : null,
    secondStatus: second.status,
    secondExternalId: second.externalId ?? null,
    sameExternalId: first.externalId === second.externalId,
    hubspotContacts: contacts.count,
    hubspotDeals: deals.count,
    contactSearchStatus: contacts.status,
    dealSearchStatus: deals.status,
    testRecordsRemoved: removed,
    testEmail: email,
  }),
);

async function search(object, property, value) {
  const response = await fetch(`https://api.hubapi.com/crm/v3/objects/${object}/search`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: property, operator: "EQ", value }] }],
      limit: 10,
    }),
  });
  const json = await response.json().catch(() => null);
  const ids = Array.isArray(json?.results) ? json.results.map((row) => row.id).filter((id) => typeof id === "string") : [];
  return { status: response.status, count: ids.length, ids };
}

async function removeTestRecords(externalId, dealIds) {
  const contactId = typeof externalId === "string" ? externalId.match(/contact:(\d+)/)?.[1] : null;
  const mappedDealId = typeof externalId === "string" ? externalId.match(/deal:(\d+)/)?.[1] : null;
  const ids = [...new Set([...(dealIds ?? []), mappedDealId].filter(Boolean))];
  let removed = 0;
  for (const id of ids) {
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    if (response.status === 204 || response.status === 200) removed += 1;
  }
  if (contactId) {
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    if (response.status === 204 || response.status === 200) removed += 1;
  }
  return removed;
}
