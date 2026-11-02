export type HubspotAuthProbe = {
  configured: boolean;
  httpStatus: number | null;
  authenticated: boolean;
  recordsModified: false;
  category: string | null;
  portalId: number | null;
};

const REQUIRED_SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.deals.read",
  "crm.objects.deals.write",
] as const;

export type HubspotScopeProbe = {
  httpStatus: number | null;
  checked: boolean;
  missing: string[];
};

export async function probeHubspotAuth(token: string): Promise<HubspotAuthProbe> {
  if (!token) {
    return { configured: false, httpStatus: null, authenticated: false, recordsModified: false, category: "missing_token", portalId: null };
  }
  const response = await fetch("https://api.hubapi.com/account-info/v3/details", {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await readSafeJson(response);
  if (response.status === 401) {
    return { configured: true, httpStatus: 401, authenticated: false, recordsModified: false, category: categoryOf(body) ?? "unauthorized", portalId: null };
  }
  if (response.status === 403) {
    return { configured: true, httpStatus: 403, authenticated: true, recordsModified: false, category: categoryOf(body) ?? "forbidden", portalId: null };
  }
  if (!response.ok) {
    return { configured: true, httpStatus: response.status, authenticated: false, recordsModified: false, category: categoryOf(body) ?? "unexpected_status", portalId: null };
  }
  const portalId = typeof body?.portalId === "number" ? body.portalId : null;
  return { configured: true, httpStatus: response.status, authenticated: true, recordsModified: false, category: null, portalId };
}

export async function probeHubspotRead(token: string, object: "contacts" | "deals"): Promise<number | null> {
  if (!token) return null;
  const response = await fetch(`https://api.hubapi.com/crm/v3/objects/${object}?limit=1`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });
  await response.arrayBuffer();
  return response.status;
}

export async function probeHubspotScopes(token: string): Promise<HubspotScopeProbe> {
  if (!token) return { httpStatus: null, checked: false, missing: [...REQUIRED_SCOPES] };
  const response = await fetch("https://api.hubapi.com/oauth/v2/private-apps/get/access-token-info", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tokenKey: token }),
  });
  const body = await readSafeJson(response);
  if (!response.ok || !Array.isArray(body?.scopes)) {
    return { httpStatus: response.status, checked: false, missing: [] };
  }
  const granted = new Set(body.scopes.filter((scope): scope is string => typeof scope === "string"));
  return {
    httpStatus: response.status,
    checked: true,
    missing: REQUIRED_SCOPES.filter((scope) => !granted.has(scope)),
  };
}

async function readSafeJson(response: Response): Promise<{ portalId?: number; category?: string; scopes?: unknown } | null> {
  try {
    const json = (await response.json()) as { portalId?: number; category?: string; scopes?: unknown };
    return { portalId: json.portalId, category: json.category, scopes: json.scopes };
  } catch {
    return null;
  }
}

function categoryOf(body: { category?: string } | null) {
  return typeof body?.category === "string" ? body.category : null;
}
