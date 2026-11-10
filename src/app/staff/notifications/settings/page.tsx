import { connection } from "next/server";
import { Suspense } from "react";
import { StaffNotificationPreferencesForm } from "@/components/staff/staff-notification-preferences-form";
import { requireStaff } from "@/crm/guard";
import { STAFF_NOTIFICATION_LABELS, STAFF_NOTIFICATION_TYPES } from "@/crm/staff-notification-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Notification settings" };

export default function StaffNotificationSettingsPage() {
  return (
    <Suspense fallback={<p className="px-4 py-12 text-sm">Loading settings…</p>}>
      <SettingsBody />
    </Suspense>
  );
}

async function SettingsBody() {
  await connection();
  const user = await requireStaff("/staff/notifications/settings");
  const supabase = await createServerSupabaseClient();

  const { data: prefs } = supabase
    ? await supabase
        .from("staff_notification_preferences")
        .select("disabled_types")
        .eq("user_id", user.userId)
        .maybeSingle()
    : { data: null };

  const disabled = new Set(prefs?.disabled_types ?? []);

  const defaults = STAFF_NOTIFICATION_TYPES.map((type) => ({
    type,
    label: STAFF_NOTIFICATION_LABELS[type],
    enabled: !disabled.has(type),
  }));

  return (
    <div className="mx-auto max-w-lg space-y-4">
        <div>
          <h2 className="font-display text-2xl text-[var(--ink)]">Notification preferences</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Choose which categories you still want in the bell and on the notifications page. Disabled types are not
            created for your account.
          </p>
        </div>
        <StaffNotificationPreferencesForm items={defaults} />
    </div>
  );
}
