import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { StaffNotificationList } from "@/components/staff/staff-notification-list";
import { EmptyState } from "@/components/catalog/empty-state";
import type { StaffNotificationRow } from "@/crm/staff-notification-types";
import { requireStaff } from "@/crm/guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Staff notifications" };

type SearchParams = Promise<{ filter?: string }>;

export default function StaffNotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="px-4 py-12 text-sm">Loading notifications…</p>}>
      <StaffNotificationsBody searchParams={searchParams} />
    </Suspense>
  );
}

async function StaffNotificationsBody({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const staff = await requireStaff("/staff/notifications");
  const params = await searchParams;
  const unreadOnly = params.filter === "unread";

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return <EmptyState title="Session required" body="Sign in again to load notifications." />;
  }

  let query = supabase
    .from("staff_notifications")
    .select(
      "id, recipient_user_id, notification_type, category, title, message, lead_id, inquiry_id, activity_id, automation_event_id, href, read_at, created_at",
    )
    .eq("recipient_user_id", staff.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (unreadOnly) query = query.is("read_at", null);

  const { data, error } = await query;
  const items = (data ?? []) as StaffNotificationRow[];

  return (
    <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-[var(--ink)]">Notification centre</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Live updates from inquiries, pipeline, follow-ups, and integrations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/staff/notifications"
              className={unreadOnly ? "underline text-[var(--muted)]" : "underline font-medium"}
            >
              All
            </Link>
            <Link
              href="/staff/notifications?filter=unread"
              className={unreadOnly ? "underline font-medium" : "underline text-[var(--muted)]"}
            >
              Unread
            </Link>
            <Link href="/staff/notifications/settings" className="underline text-[var(--muted)]">
              Settings
            </Link>
          </div>
        </div>

        {error ? (
          <EmptyState title="Could not load notifications" body={error.message} />
        ) : (
          <StaffNotificationList
            items={items}
            emptyTitle={unreadOnly ? "No unread notifications" : "No notifications yet"}
            emptyBody={
              unreadOnly
                ? "Switch to All to see your history."
                : "New inquiries and integration alerts will appear here automatically."
            }
          />
        )}
    </div>
  );
}
