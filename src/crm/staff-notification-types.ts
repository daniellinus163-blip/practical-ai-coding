export const STAFF_NOTIFICATION_TYPES = [
  "inquiry.new",
  "customer.message",
  "lead.assigned",
  "lead.status_changed",
  "follow_up.due",
  "follow_up.overdue",
  "integration.hubspot_failed",
  "integration.email_failed",
  "integration.worker_failed",
] as const;

export type StaffNotificationType = (typeof STAFF_NOTIFICATION_TYPES)[number];

export type StaffNotificationCategory = "inquiry" | "pipeline" | "assignment" | "follow_up" | "integration";

export const STAFF_NOTIFICATION_LABELS: Record<StaffNotificationType, string> = {
  "inquiry.new": "New inquiries",
  "customer.message": "Customer messages",
  "lead.assigned": "Lead assignments",
  "lead.status_changed": "Stage changes",
  "follow_up.due": "Follow-ups due",
  "follow_up.overdue": "Overdue follow-ups",
  "integration.hubspot_failed": "HubSpot sync failures",
  "integration.email_failed": "Email delivery failures",
  "integration.worker_failed": "Background worker failures",
};

export function isStaffNotificationType(value: string): value is StaffNotificationType {
  return (STAFF_NOTIFICATION_TYPES as readonly string[]).includes(value);
}

export type StaffNotificationRow = {
  id: string;
  recipient_user_id: string;
  notification_type: StaffNotificationType;
  category: string;
  title: string;
  message: string;
  lead_id: string | null;
  inquiry_id: string | null;
  activity_id: string | null;
  automation_event_id: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export function notificationHref(row: Pick<StaffNotificationRow, "href" | "lead_id" | "automation_event_id">): string {
  if (row.href?.startsWith("/")) return row.href;
  if (row.lead_id) return `/staff/leads/${row.lead_id}`;
  if (row.automation_event_id) return "/staff/events";
  return "/staff/notifications";
}
