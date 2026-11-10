"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/crm/guard";
import { isStaffNotificationType, STAFF_NOTIFICATION_TYPES } from "@/crm/staff-notification-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ActionState = { error: string | null; success: string | null };

function revalidateNotificationPaths() {
  revalidatePath("/staff");
  revalidatePath("/staff/notifications");
  revalidatePath("/staff/notifications/settings");
}

export async function markStaffNotificationReadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff("/staff/notifications");
  const id = String(formData.get("id") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Invalid notification.", success: null };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Not signed in.", success: null };

  const { error } = await supabase
    .from("staff_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) return { error: error.message, success: null };

  revalidateNotificationPaths();
  return { error: null, success: "Marked as read." };
}

export async function markAllStaffNotificationsReadAction(): Promise<ActionState> {
  const staff = await requireStaff("/staff/notifications");
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Not signed in.", success: null };

  const { error } = await supabase
    .from("staff_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_user_id", staff.userId)
    .is("read_at", null);
  if (error) return { error: error.message, success: null };

  revalidateNotificationPaths();
  return { error: null, success: "All notifications marked as read." };
}

export async function updateStaffNotificationPreferencesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireStaff("/staff/notifications/settings");
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Not signed in.", success: null };

  const disabled: string[] = [];
  for (const type of STAFF_NOTIFICATION_TYPES) {
    const enabled = String(formData.get(`type_${type}`) ?? "") === "on";
    if (!enabled) disabled.push(type);
  }

  const { error } = await supabase.from("staff_notification_preferences").upsert({
    user_id: staff.userId,
    disabled_types: disabled.filter(isStaffNotificationType),
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message, success: null };

  revalidateNotificationPaths();
  return { error: null, success: "Preferences saved." };
}
