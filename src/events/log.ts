const SECRET_PATTERN = /(api[_-]?key|token|secret|authorization|bearer\s+[a-z0-9._-]+)/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function safeLogMessage(value: string): string {
  return value.replace(EMAIL_PATTERN, "[redacted-email]").replace(SECRET_PATTERN, "[redacted]");
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
