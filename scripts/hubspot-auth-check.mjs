import { readFileSync } from "node:fs";
import { probeHubspotAuth, probeHubspotRead, probeHubspotScopes } from "../src/events/hubspot-probe.ts";

function tokenFromEnvFile() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("HUBSPOT_ACCESS_TOKEN=")) continue;
    return line.slice("HUBSPOT_ACCESS_TOKEN=".length).trim().replace(/^['"]|['"]$/g, "");
  }
  return "";
}

const token = process.env.HUBSPOT_ACCESS_TOKEN?.trim() || tokenFromEnvFile();
const format = token.startsWith("pat-") ? "hubspot_pat" : token ? "unrecognized_prefix" : "missing";
const auth = await probeHubspotAuth(token);
const scopes = auth.authenticated ? await probeHubspotScopes(token) : { httpStatus: null, checked: false, missing: [] };
const contactsReadStatus = auth.authenticated ? await probeHubspotRead(token, "contacts") : null;
const dealsReadStatus = auth.authenticated ? await probeHubspotRead(token, "deals") : null;

console.log(
  JSON.stringify({
    variable: "HUBSPOT_ACCESS_TOKEN",
    present: Boolean(token),
    format,
    authHeader: "Authorization: Bearer",
    serviceKeyCompatible: true,
    probe: "GET /account-info/v3/details",
    httpStatus: auth.httpStatus,
    authenticated: auth.authenticated,
    recordsModified: false,
    category: auth.category,
    portalId: auth.portalId,
    scopeCheck: scopes.checked ? "listed" : "unavailable",
    scopeHttpStatus: scopes.httpStatus,
    missingScopes: scopes.missing,
    contactsReadStatus,
    dealsReadStatus,
  }),
);
