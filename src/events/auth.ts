import { timingSafeStringEqual } from "@/events/signature";

export function workerAuthorized(request: Request, secret: string | readonly string[]): boolean {
  const secrets = (Array.isArray(secret) ? secret : [secret]).map((value) => value.trim()).filter(Boolean);
  if (secrets.length === 0) return false;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!bearer) return false;
  return secrets.some((value) => timingSafeStringEqual(bearer, value));
}

export function canViewIntegrations(role: string | null): boolean {
  return role === "staff" || role === "admin";
}

export function canRetryEvents(role: string | null): boolean {
  return role === "admin";
}
