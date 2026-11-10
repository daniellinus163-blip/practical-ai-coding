import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { catalogRepository } from "@/catalog/local-repository";
import { EmptyState } from "@/components/catalog/empty-state";
import { SetupNotice } from "@/components/auth/setup-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { buildConfigurationDetails } from "@/crm/configuration-summary";
import { LeadConfigurationPanel } from "@/components/staff/lead-configuration-panel";
import { InquiryNotifications } from "@/components/account/inquiry-notifications";
import { InquiryReplyForm } from "@/components/account/inquiry-reply-form";
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
  const [rowsResult, profileResult, role, notificationsResult] = await Promise.all([
    supabase
      ? supabase
          .from("inquiries")
          .select("id, vehicle_slug, message, status, created_at, configuration_snapshot, configuration_id")
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
    supabase
      ? supabase
          .from("customer_notifications")
          .select("id, inquiry_id, title, body, read_at, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const rows = rowsResult.data ?? [];
  const notifications = notificationsResult.data ?? [];
  const notificationsByInquiry = new Map<string, typeof notifications>();
  for (const note of notifications) {
    if (!note.inquiry_id) continue;
    const list = notificationsByInquiry.get(note.inquiry_id) ?? [];
    list.push(note);
    notificationsByInquiry.set(note.inquiry_id, list);
  }
  const unreadCount = notifications.filter((n) => !n.read_at).length;
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
      inquiryUnreadCount={unreadCount}
    >
      {unreadCount > 0 ? (
        <p className="mb-4 rounded-md border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm">
          You have <strong>{unreadCount}</strong> new{" "}
          {unreadCount === 1 ? "reply" : "replies"} from the FormShift team below.
        </p>
      ) : null}
      {rowsResult.error ? <p className="text-sm text-[var(--danger)]">{rowsResult.error.message}</p> : null}
      {rows.length === 0 ? (
        <EmptyState
          title="No inquiries yet"
          body="Send a question from a vehicle page while you are signed in. It is not an order. Inquiries sent before you sign in stay private and are not added to this list."
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const vehicle = row.vehicle_slug ? vehicles.find((v) => v.slug === row.vehicle_slug) ?? null : null;
            const configRows = vehicle
              ? buildConfigurationDetails({
                  snapshot: row.configuration_snapshot,
                  vehicle,
                  savedConfigurationName: null,
                  savedConfigurationId: row.configuration_id,
                  defaultTrimName: vehicle.configurations.find((c) => c.isDefault)?.name ?? null,
                })
              : [];
            return (
            <li key={row.id}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="font-display text-lg">
                      {row.vehicle_slug ? vehicleNames.get(row.vehicle_slug) ?? row.vehicle_slug : "General inquiry"}
                    </CardTitle>
                    <Badge variant="outline">{row.status}</Badge>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      FSA-{row.id.slice(0, 8).toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatSubmitted(row.created_at)}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InquiryNotifications inquiryId={row.id} items={notificationsByInquiry.get(row.id) ?? []} />
                  <p className="text-sm leading-relaxed">{row.message}</p>
                  <InquiryReplyForm inquiryId={row.id} />
                  {configRows.length > 0 ? (
                    <LeadConfigurationPanel
                      rows={configRows}
                      vehicleHref={row.vehicle_slug ? `/cars/${row.vehicle_slug}` : null}
                      previewNote={null}
                    />
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/inquiries/confirmation?ref=${encodeURIComponent(row.id)}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Confirmation page
                    </Link>
                    {row.vehicle_slug ? (
                      <Link href={`/cars/${row.vehicle_slug}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Open vehicle
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </li>
            );
          })}
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
