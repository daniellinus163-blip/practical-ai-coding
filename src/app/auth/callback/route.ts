import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const providerError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (providerError) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", providerError);
    if (next !== "/account") login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const login = new URL("/login", url.origin);
        login.searchParams.set("error", error.message);
        if (next !== "/account") login.searchParams.set("next", next);
        return NextResponse.redirect(login);
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
