import type { IntegrationConfig } from "@/events/config";
import { safeLogMessage } from "@/events/log";

export type HubspotVerifyResult =
  | { ok: true; message: string }
  | { ok: false; message: string; retryable: boolean };

export async function verifyHubspotToken(config: IntegrationConfig): Promise<HubspotVerifyResult> {
  if (!config.hubspotToken) {
    return { ok: false, message: "HUBSPOT_ACCESS_TOKEN is not set.", retryable: false };
  }
  try {
    const response = await fetch("https://api.hubapi.com/crm/v3/objects/deals?limit=1", {
      method: "GET",
      headers: { authorization: `Bearer ${config.hubspotToken}` },
      cache: "no-store",
    });
    const text = await response.text();
    if (response.status === 401 || response.status === 403) {
      return { ok: false, message: `HubSpot rejected the token (HTTP ${response.status}).`, retryable: false };
    }
    if (response.ok) {
      return { ok: true, message: "HubSpot API accepted the token (read deals scope)." };
    }
    return {
      ok: false,
      message: `HubSpot returned HTTP ${response.status}: ${safeLogMessage(text).slice(0, 160)}`,
      retryable: response.status >= 500,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "HubSpot request failed.",
      retryable: true,
    };
  }
}
