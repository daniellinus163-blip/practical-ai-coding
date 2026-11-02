import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/auth/actions";
import { AuthAccountChip } from "@/components/auth/auth-account-chip";
import { avatarPublicUrl } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";

async function AuthNavInner() {
  await connection();
  if (!isSupabaseConfigured()) {
    return (
      <Link href="/login" className="text-sm text-[var(--ink)] hover:text-[var(--brass)]">
        Sign in
      </Link>
    );
  }
  const user = await getAuthUser();
  if (!user) {
    return (
      <Link href="/login" className="text-sm text-[var(--ink)] hover:text-[var(--brass)]">
        Sign in
      </Link>
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data } = supabase
    ? await supabase
        .from("customer_profiles")
        .select("display_name, avatar_path, updated_at")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="flex items-center gap-3 text-sm">
      <AuthAccountChip
        displayName={data?.display_name ?? ""}
        email={user.email ?? ""}
        avatarUrl={avatarPublicUrl(data?.avatar_path, data?.updated_at)}
      />
      <form action={signOutAction}>
        <button type="submit" className="text-[var(--ink)] hover:text-[var(--brass)]">
          Sign out
        </button>
      </form>
    </div>
  );
}

export function AuthNav() {
  return (
    <Suspense fallback={<span className="text-sm text-[var(--muted)]">Account</span>}>
      <AuthNavInner />
    </Suspense>
  );
}
