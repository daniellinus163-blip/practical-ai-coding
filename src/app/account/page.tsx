import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { SetupNotice } from "@/components/auth/setup-notice";
import { EmptyState } from "@/components/catalog/empty-state";
import { avatarPublicUrl, profileCompleteness } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";
import { getStaffRole } from "@/lib/supabase/staff";

export const metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 text-sm">Loading account…</div>}>
      <AccountBody />
    </Suspense>
  );
}

async function AccountBody() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-12">
        <h1 className="font-display text-4xl">Account</h1>
        <SetupNotice />
        <EmptyState
          title="Accounts are offline"
          body="The catalog still works. Connect Supabase to enable registration, saved builds, and inquiries."
        />
        <Link href="/discover" className="text-sm underline">
          Back to Discover
        </Link>
      </div>
    );
  }

  const user = await getAuthUser();
  if (!user) redirect("/login?next=/account");

  const supabase = await createServerSupabaseClient();
  const [profileResult, buildsResult, inquiriesResult, role] = await Promise.all([
    supabase
      ? supabase
          .from("customer_profiles")
          .select("display_name, phone, country, city, preferred_contact, avatar_path, updated_at")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: { message: "Client unavailable" } }),
    supabase
      ? supabase
          .from("saved_configurations")
          .select("id, vehicle_slug, name, created_at, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] as never[], error: null }),
    supabase
      ? supabase
          .from("inquiries")
          .select("id, vehicle_slug, status, created_at, message")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] as never[], error: null }),
    getStaffRole(),
  ]);

  const displayName = profileResult.data?.display_name ?? "";
  const avatarUrl = avatarPublicUrl(profileResult.data?.avatar_path, profileResult.data?.updated_at);
  const completeness = profileCompleteness({
    displayName,
    phone: profileResult.data?.phone ?? "",
    country: profileResult.data?.country ?? "",
    city: profileResult.data?.city ?? "",
    hasAvatar: Boolean(profileResult.data?.avatar_path),
  });
  const builds = buildsResult.data ?? [];
  const inquiries = inquiriesResult.data ?? [];

  return (
    <AccountShell
      currentPath="/account"
      displayName={displayName}
      email={user.email ?? ""}
      avatarUrl={avatarUrl}
      staffHref={role ? "/staff" : null}
    >
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="border border-[var(--line)] bg-[var(--card)] p-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Profile</p>
            <p className="font-display mt-2 text-4xl">{completeness.percent}%</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {completeness.done} of {completeness.total} details filled
            </p>
            <Link href="/account/profile" className="mt-4 inline-block text-sm underline">
              Manage profile
            </Link>
          </div>
          <div className="border border-[var(--line)] bg-[var(--card)] p-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Builds</p>
            <p className="font-display mt-2 text-4xl">{builds.length}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Recent saved studios</p>
            <Link href="/my-builds" className="mt-4 inline-block text-sm underline">
              View all builds
            </Link>
          </div>
          <div className="border border-[var(--line)] bg-[var(--card)] p-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Inquiries</p>
            <p className="font-display mt-2 text-4xl">{inquiries.length}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Latest quote requests</p>
            <Link href="/account/inquiries" className="mt-4 inline-block text-sm underline">
              View all inquiries
            </Link>
          </div>
        </section>

        <section className="border border-[var(--line)] bg-[var(--card)] p-6">
          <h2 className="font-display text-2xl">Account status</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Email</dt>
              <dd className="mt-1">{user.email}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Email confirmed</dt>
              <dd className="mt-1">{user.email_confirmed_at ? "Yes" : "Pending confirmation"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Member since</dt>
              <dd className="mt-1">{user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Last sign-in</dt>
              <dd className="mt-1">
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}
              </dd>
            </div>
          </dl>
          {completeness.percent < 100 ? (
            <ul className="mt-4 space-y-1 text-sm text-[var(--muted)]">
              {completeness.checks
                .filter((item) => !item.done)
                .map((item) => (
                  <li key={item.id}>Still needed: {item.label}</li>
                ))}
            </ul>
          ) : null}
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl">Recent builds</h2>
            <Link href="/discover" className="text-sm underline">
              Open catalog
            </Link>
          </div>
          {buildsResult.error ? (
            <p className="text-sm text-[var(--danger)]">{buildsResult.error.message}</p>
          ) : builds.length === 0 ? (
            <EmptyState
              title="No saved builds yet"
              body="Open a car studio, change colours, then Save to account."
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {builds.map((build) => (
                <li key={build.id} className="border border-[var(--line)] bg-[var(--card)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{build.vehicle_slug}</p>
                  <p className="font-display mt-1 text-xl">{build.name ?? "Studio build"}</p>
                  <Link
                    href={`/cars/${build.vehicle_slug}?build=${build.id}#studio`}
                    className="mt-3 inline-block text-sm underline"
                  >
                    Reopen in studio
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AccountShell>
  );
}
