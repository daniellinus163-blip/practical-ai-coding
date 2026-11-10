import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { deleteConfigurationAction } from "@/app/account/build-actions";
import { AccountShell } from "@/components/account/account-shell";
import { SetupNotice } from "@/components/auth/setup-notice";
import { EmptyState } from "@/components/catalog/empty-state";
import { avatarPublicUrl } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";
import { getStaffRole } from "@/lib/supabase/staff";

export const metadata = { title: "My Builds", robots: { index: false, follow: false } };

export default function MyBuildsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 text-sm">Loading builds…</div>}>
      <MyBuildsBody />
    </Suspense>
  );
}

async function MyBuildsBody() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-12">
        <h1 className="font-display text-4xl">My Builds</h1>
        <SetupNotice />
        <EmptyState
          title="No account storage yet"
          body="The studio can still save a copy in this browser. Connect Supabase to keep builds on your account."
        />
      </div>
    );
  }

  const user = await getAuthUser();
  if (!user) redirect("/login?next=/my-builds");

  const supabase = await createServerSupabaseClient();
  const [buildsResult, profileResult, role] = await Promise.all([
    supabase
      ? supabase
          .from("saved_configurations")
          .select("id, vehicle_slug, name, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null, error: { message: "Client unavailable" } }),
    supabase
      ? supabase
          .from("customer_profiles")
          .select("display_name, avatar_path, updated_at")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    getStaffRole(),
  ]);

  const builds = buildsResult.data ?? [];

  return (
    <AccountShell
      currentPath="/my-builds"
      displayName={profileResult.data?.display_name ?? ""}
      email={user.email ?? ""}
      avatarUrl={avatarPublicUrl(profileResult.data?.avatar_path, profileResult.data?.updated_at)}
      staffHref={role ? "/staff" : null}
    >
      {buildsResult.error ? <p className="text-sm text-[var(--danger)]">{buildsResult.error.message}</p> : null}
      {builds.length === 0 ? (
        <EmptyState
          title="No saved configurations yet"
          body="Open a car studio and use Save to account. Browser-only Save still works without signing in."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {builds.map((build) => (
            <li key={build.id} className="border border-[var(--line)] bg-[var(--card)] p-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{build.vehicle_slug}</p>
              <h2 className="font-display mt-1 text-2xl">{build.name ?? "Studio build"}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{new Date(build.created_at).toLocaleString()}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/cars/${build.vehicle_slug}?build=${build.id}#studio`}
                  className="on-dark bg-[var(--ink)] px-4 py-2 text-sm"
                >
                  Reopen in studio
                </Link>
                <form action={deleteConfigurationAction}>
                  <input type="hidden" name="id" value={build.id} />
                  <button type="submit" className="border border-[var(--line)] px-4 py-2 text-sm">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
