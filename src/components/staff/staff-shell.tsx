import Link from "next/link";
import { connection } from "next/server";
import { requireStaff } from "@/crm/guard";
import type { StaffNotificationRow } from "@/crm/staff-notification-types";
import { StaffConfigNotice } from "@/components/staff/staff-config-notice";
import { StaffMobileNav, StaffNavList } from "@/components/staff/staff-nav";
import { StaffNotificationBell } from "@/components/staff/staff-notification-bell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function StaffShell({
  children,
  nextPath,
}: {
  children: React.ReactNode;
  nextPath: string;
}) {
  await connection();
  const staff = await requireStaff(nextPath);
  const supabase = await createServerSupabaseClient();

  let initialUnread = 0;
  let initialItems: StaffNotificationRow[] = [];

  if (supabase) {
    const [countResult, listResult] = await Promise.all([
      supabase
        .from("staff_notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", staff.userId)
        .is("read_at", null),
      supabase
        .from("staff_notifications")
        .select(
          "id, recipient_user_id, notification_type, category, title, message, lead_id, inquiry_id, activity_id, automation_event_id, href, read_at, created_at",
        )
        .eq("recipient_user_id", staff.userId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    initialUnread = countResult.count ?? 0;
    initialItems = (listResult.data ?? []) as StaffNotificationRow[];
  }

  const displayEmail = staff.email ? maskEmail(staff.email) : "Signed in";

  return (
    <div className="staff-app-grid min-h-[100dvh] w-full">
      <aside className="staff-sidebar hidden border-r lg:flex lg:flex-col" aria-label="Staff navigation">
        <div className="border-b border-[var(--staff-sidebar-line)] px-5 py-6">
          <Link href="/staff" className="block">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--staff-sidebar-muted)]">FormShift AI</p>
            <p className="font-display mt-1 text-xl text-[var(--staff-sidebar-text)]">Command CRM</p>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          <StaffNavList />
        </nav>
        <div className="border-t border-[var(--staff-sidebar-line)] px-4 py-4 text-xs leading-relaxed text-[var(--staff-sidebar-muted)]">
          <p className="truncate" title={staff.email ?? undefined}>
            {displayEmail}
          </p>
          <p className="mt-2 capitalize">Role · {staff.role}</p>
          <Link href="/discover" className="mt-3 inline-block underline underline-offset-2">
            Public studio
          </Link>
        </div>
      </aside>

      <div className="staff-app-main flex min-w-0 flex-col">
        <header className="staff-topbar flex shrink-0 items-center justify-between gap-4 border-b px-4 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <StaffMobileNav />
            <div className="min-w-0 lg:hidden">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">FormShift AI</p>
              <p className="font-display truncate text-lg">Command CRM</p>
            </div>
            <p className="hidden text-xs uppercase tracking-[0.18em] text-[var(--muted)] lg:block">
              Automotive sales command
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StaffNotificationBell
              userId={staff.userId}
              initialUnread={initialUnread}
              initialItems={initialItems}
            />
          </div>
        </header>

        <div id="staff-main" className="staff-main min-h-0 flex-1 overflow-y-auto px-4 py-8 lg:px-10 lg:py-10">
          {!staff.serviceRole ? (
            <StaffConfigNotice />
          ) : null}
          <div className="mx-auto w-full max-w-6xl space-y-12">{children}</div>
        </div>
      </div>
    </div>
  );
}

function maskEmail(email: string) {
  const at = email.indexOf("@");
  if (at < 2) return email;
  return `${email.slice(0, 2)}…${email.slice(at)}`;
}
