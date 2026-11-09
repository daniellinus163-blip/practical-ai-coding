/** HubSpot record IDs are numeric strings from trusted API/mapping storage only. */
const HUBSPOT_NUMERIC_ID = /^\d+$/;

export function hubspotPortalIdFromEnv(): string | null {
  const raw = process.env.HUBSPOT_PORTAL_ID?.trim() ?? "";
  return HUBSPOT_NUMERIC_ID.test(raw) ? raw : null;
}

export function sanitizeHubspotRecordId(id: string | null | undefined): string | null {
  const trimmed = id?.trim() ?? "";
  return HUBSPOT_NUMERIC_ID.test(trimmed) ? trimmed : null;
}

export function hubspotContactRecordUrl(portalId: string, contactId: string): string | null {
  const portal = sanitizeHubspotRecordId(portalId);
  const contact = sanitizeHubspotRecordId(contactId);
  if (!portal || !contact) return null;
  return `https://app.hubspot.com/contacts/${portal}/contact/${contact}`;
}

export function hubspotDealRecordUrl(portalId: string, dealId: string): string | null {
  const portal = sanitizeHubspotRecordId(portalId);
  const deal = sanitizeHubspotRecordId(dealId);
  if (!portal || !deal) return null;
  return `https://app.hubspot.com/contacts/${portal}/deal/${deal}`;
}
