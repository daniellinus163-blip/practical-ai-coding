import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/auth/actions";
import { AuthAccountChip } from "@/components/auth/auth-account-chip";
import { avatarPublicUrl } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { countUnreadCustomerNotifications } from "@/lib/notifications";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";
import { getStaffRole } from "@/lib/supabase/staff";

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
  const [{ data }, unread, staffRole] = await Promise.all([
    supabase
      ? supabase
          .from("customer_profiles")
          .select("display_name, avatar_path, updated_at")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase ? countUnreadCustomerNotifications(supabase, user.id) : Promise.resolve(0),
    getStaffRole(),
  ]);

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/account/inquiries" className="relative text-[var(--ink)] hover:text-[var(--brass)]">
        Inquiries
        {unread > 0 ? (
          <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--ink)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--hero-text)]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Link>
      {staffRole ? (
        <Link href="/staff" className="text-[var(--ink)] hover:text-[var(--brass)]">
          CRM
        </Link>
      ) : null}
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
