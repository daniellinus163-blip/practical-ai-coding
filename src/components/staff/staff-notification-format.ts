import { STAFF_NOTIFICATION_LABELS, type StaffNotificationRow } from "@/crm/staff-notification-types";

export function formatNotificationWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function notificationCategoryLabel(row: StaffNotificationRow): string {
  return STAFF_NOTIFICATION_LABELS[row.notification_type] ?? row.category;
}
