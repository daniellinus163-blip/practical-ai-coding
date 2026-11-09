import type { NextRequest } from "next/server";

export const AUTH_NEXT_COOKIE = "formshift_auth_next";
const NEXT_MAX_AGE = 60 * 15;

/** OAuth redirect URL must match Supabase “Redirect URLs” exactly — no query string. */
export function oauthCallbackRedirectUri(origin: string) {
  return new URL("/auth/callback", origin).toString();
}

export function setAuthNextCookie(origin: string, nextPath: string) {
  if (typeof document === "undefined") return;
  const secure = origin.startsWith("https:");
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(nextPath)}; Path=/; Max-Age=${NEXT_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function getRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const proto = forwardedProto?.split(",")[0]?.trim() || "https";
    return `${proto}://${forwardedHost.split(",")[0]?.trim()}`;
  }
  return new URL(request.url).origin;
}
