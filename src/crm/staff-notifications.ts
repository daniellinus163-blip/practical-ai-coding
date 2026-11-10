import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { StaffNotificationType } from "@/crm/staff-notification-types";

export type StaffNotificationInput = {
  type: StaffNotificationType;
  category: string;
  title: string;
  message: string;
  leadId?: string | null;
  inquiryId?: string | null;
  activityId?: string | null;
  automationEventId?: string | null;
  href?: string | null;
  dedupeKey?: string | null;
  recipientUserId?: string | null;
  excludeUserId?: string | null;
};

function adminOrThrow(): SupabaseClient {
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("service_role_missing");
  return admin;
}

export async function notifyStaff(input: StaffNotificationInput, admin = adminOrThrow()): Promise<void> {
  if (input.recipientUserId) {
    await admin.rpc("staff_notify_user", {
      p_user_id: input.recipientUserId,
      p_type: input.type,
      p_category: input.category,
      p_title: input.title.slice(0, 200),
      p_message: input.message.slice(0, 4000),
      p_lead_id: input.leadId ?? null,
      p_inquiry_id: input.inquiryId ?? null,
      p_activity_id: input.activityId ?? null,
      p_automation_event_id: input.automationEventId ?? null,
      p_href: input.href ?? null,
      p_dedupe_key: input.dedupeKey ?? null,
    });
    return;
  }

  await admin.rpc("staff_notify_all_staff", {
    p_type: input.type,
    p_category: input.category,
    p_title: input.title.slice(0, 200),
    p_message: input.message.slice(0, 4000),
    p_lead_id: input.leadId ?? null,
    p_inquiry_id: input.inquiryId ?? null,
    p_activity_id: input.activityId ?? null,
    p_automation_event_id: input.automationEventId ?? null,
    p_href: input.href ?? null,
    p_dedupe_key: input.dedupeKey ?? null,
    p_exclude_user_id: input.excludeUserId ?? null,
  });
}

export async function notifyIntegrationDeliveryFailure(input: {
  integration: string;
  eventId: string;
  eventType: string;
  leadId?: string | null;
  inquiryId?: string | null;
  error?: string | null;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  if (!admin) return;

  const isHubspot = input.integration === "hubspot";
  const isEmail = input.integration === "resend" || input.integration === "resend_staff";
  if (!isHubspot && !isEmail) return;

  const type = isHubspot ? "integration.hubspot_failed" : "integration.email_failed";
  const title = isHubspot ? "HubSpot sync failed" : "Email delivery failed";
  const detail = (input.error ?? "delivery_failed").slice(0, 200);

  await notifyStaff(
    {
      type,
      category: "integration",
      title,
      message: `${input.eventType}: ${detail}`,
      leadId: input.leadId ?? null,
      inquiryId: input.inquiryId ?? null,
      automationEventId: input.eventId,
      href: "/staff/events",
      dedupeKey: `${type}:${input.eventId}:${input.integration}`,
    },
    admin,
  );
}

export async function notifyWorkerEventFailure(input: {
  eventId: string;
  eventType: string;
  leadId?: string | null;
  inquiryId?: string | null;
  error?: string | null;
  status: "failed" | "dead";
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  if (!admin) return;

  await notifyStaff(
    {
      type: "integration.worker_failed",
      category: "integration",
      title: input.status === "dead" ? "Automation event stopped" : "Automation event failed",
      message: `${input.eventType}: ${(input.error ?? input.status).slice(0, 200)}`,
      leadId: input.leadId ?? null,
      inquiryId: input.inquiryId ?? null,
      automationEventId: input.eventId,
      href: "/staff/events",
      dedupeKey: `worker:${input.eventId}:${input.status}`,
    },
    admin,
  );
}

export async function notifyFollowUpDue(input: {
  leadId: string;
  inquiryId?: string | null;
  title: string;
  overdue?: boolean;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  if (!admin) return;
  const type = input.overdue ? "follow_up.overdue" : "follow_up.due";
  await notifyStaff(
    {
      type,
      category: "follow_up",
      title: input.overdue ? "Overdue follow-up" : "Follow-up due",
      message: input.title,
      leadId: input.leadId,
      inquiryId: input.inquiryId ?? null,
      href: `/staff/leads/${input.leadId}`,
      dedupeKey: `${type}:${input.leadId}`,
    },
    admin,
  );
}

export async function countUnreadStaffNotifications(admin: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await admin
    .from("staff_notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}
