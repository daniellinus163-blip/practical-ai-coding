import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_NEXT_COOKIE, getRequestOrigin } from "@/lib/supabase/auth-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

export async function GET(request: NextRequest) {
  await connection();
  const requestUrl = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = requestUrl.searchParams.get("code");
  const providerError =
    requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");

  const nextCookie = request.cookies.get(AUTH_NEXT_COOKIE)?.value;
  const nextFromQuery = requestUrl.searchParams.get("next");
  const next = safeNextPath(
    nextCookie ? decodeURIComponent(nextCookie) : nextFromQuery,
  );

  const clearNext = (response: NextResponse) => {
    response.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  };

  if (providerError) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", providerError);
    return clearNext(NextResponse.redirect(login));
  }

  if (!code) {
    const login = new URL("/login", origin);
    login.searchParams.set(
      "error",
      "Sign-in was interrupted before FormShift could receive a code. Try again.",
    );
    return clearNext(NextResponse.redirect(login));
  }

  if (!isSupabaseConfigured()) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "Supabase is not configured on this server.");
    return clearNext(NextResponse.redirect(login));
  }

  const destination = new URL(next, origin);
  let response = clearNext(NextResponse.redirect(destination));
  const supabase = createRouteHandlerSupabaseClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const login = new URL("/login", origin);
    const hint =
      error.status === 400
        ? `${error.message} Check Supabase redirect URL ${origin}/auth/callback (no query string) and X developer callback https://YOUR-PROJECT.supabase.co/auth/v1/callback.`
        : error.message;
    login.searchParams.set("error", hint);
    return clearNext(NextResponse.redirect(login));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const login = new URL("/login", origin);
    login.searchParams.set(
      "error",
      "Social sign-in finished but the session cookie was not saved. Try email sign-in or clear site cookies and retry.",
    );
    return clearNext(NextResponse.redirect(login));
  }

  if (next.startsWith("/staff")) {
    revalidatePath("/staff", "layout");
  }

  return response;
}
