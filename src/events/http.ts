import { isPermanentStatus, isRetryableStatus } from "@/events/backoff";
import type { DeliveryResult } from "@/events/types";

export async function postJson(input: {
  url: string;
  body: string;
  headers: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 8000);
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(input.url, {
      method: "POST",
      headers: input.headers,
      body: input.body,
      signal: controller.signal,
    });
    const text = await response.text();
    return { status: response.status, text: text.slice(0, 500) };
  } finally {
    clearTimeout(timer);
  }
}

export function resultFromHttp(status: number, text: string, externalId?: string): DeliveryResult {
  if (status >= 200 && status < 300) {
    return { status: "succeeded", retryable: false, externalId };
  }
  const error = `http_${status}`;
  if (isRetryableStatus(status)) return { status: "failed", retryable: true, error: `${error} ${text}`.trim() };
  if (isPermanentStatus(status)) return { status: "failed", retryable: false, error: `${error} ${text}`.trim() };
  return { status: "failed", retryable: true, error };
}

export function networkFailure(error: unknown): DeliveryResult {
  const message = error instanceof Error ? error.name : "network";
  return { status: "failed", retryable: true, error: message === "AbortError" ? "timeout" : "network" };
}
