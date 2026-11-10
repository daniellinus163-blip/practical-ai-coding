const SECRET_PATTERN = /(api[_-]?key|token|secret|authorization|bearer\s+[a-z0-9._-]+)/gi;
const KEY_MATERIAL_PATTERN = /\b(sk_|pat-|re_)[a-z0-9_-]+\b/gi;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function safeLogMessage(value: string): string {
  return value
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(KEY_MATERIAL_PATTERN, "[redacted]")
    .replace(SECRET_PATTERN, "[redacted]");
}

/** Staff UI and tables — never show raw tokens or full provider payloads. */
export function staffDisplayError(value: string | null | undefined, maxLen = 240): string | null {
  if (!value?.trim()) return null;
  return safeLogMessage(value.trim()).slice(0, maxLen);
}

export function integrationLog(entry: {
  eventId: string;
  type: string;
  integration: string;
  status: string;
  httpStatus?: number;
  error?: string;
}): Record<string, string | number | undefined> {
  return {
    eventId: entry.eventId,
    type: entry.type,
    integration: entry.integration,
    status: entry.status,
    httpStatus: entry.httpStatus,
    error: entry.error ? safeLogMessage(entry.error).slice(0, 400) : undefined,
  };
}
