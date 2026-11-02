import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { catalogRepository } from "@/catalog/local-repository";
import { EmptyState } from "@/components/catalog/empty-state";
import { SetupNotice } from "@/components/auth/setup-notice";
import { avatarPublicUrl } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";
import { getStaffRole } from "@/lib/supabase/staff";

export const metadata = { title: "My inquiries" };

export default function MyInquiriesPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 text-sm">Loading inquiries…</div>}>
      <MyInquiriesBody />
    </Suspense>
  );
}

async function MyInquiriesBody() {
  await connection();
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-12">
        <h1 className="font-display text-4xl">My inquiries</h1>
        <SetupNotice />
      </div>
    );
  }

  const user = await getAuthUser();
  if (!user) redirect("/login?next=/account/inquiries");

  const supabase = await createServerSupabaseClient();
  const [rowsResult, profileResult, role] = await Promise.all([
    supabase
      ? supabase
          .from("inquiries")
          .select("id, vehicle_slug, message, status, created_at")
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

  const rows = rowsResult.data ?? [];
  const vehicles = await catalogRepository.getVehiclesBySlugs(
    rows.map((row) => row.vehicle_slug).filter((slug): slug is string => Boolean(slug)),
  );
  const vehicleNames = new Map(vehicles.map((vehicle) => [vehicle.slug, `${vehicle.brand.name} ${vehicle.model}`]));

  return (
    <AccountShell
      currentPath="/account/inquiries"
      displayName={profileResult.data?.display_name ?? ""}
      email={user.email ?? ""}
      avatarUrl={avatarPublicUrl(profileResult.data?.avatar_path, profileResult.data?.updated_at)}
      staffHref={role ? "/staff" : null}
    >
      {rowsResult.error ? <p className="text-sm text-[var(--danger)]">{rowsResult.error.message}</p> : null}
      {rows.length === 0 ? (
        <EmptyState
          title="No inquiries yet"
          body="Send a question from a vehicle page while you are signed in. It is not an order. Inquiries sent before you sign in stay private and are not added to this list."
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="border border-[var(--line)] bg-[var(--card)] p-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {row.status} · {row.vehicle_slug ? vehicleNames.get(row.vehicle_slug) ?? row.vehicle_slug : "General"}
              </p>
              <p className="mt-2 text-sm">{row.message}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">{formatSubmitted(row.created_at)}</p>
              {row.vehicle_slug ? (
                <Link href={`/cars/${row.vehicle_slug}`} className="mt-3 inline-block text-sm underline">
                  Open vehicle
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}

function formatSubmitted(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}
