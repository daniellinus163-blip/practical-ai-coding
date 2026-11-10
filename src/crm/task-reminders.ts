import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyStaff } from "@/crm/staff-notifications";

const OVERDUE_AFTER_MS = 24 * 60 * 60 * 1000;

export type TaskReminderRow = {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  assigned_to: string | null;
  due_notified_at: string | null;
  overdue_notified_at: string | null;
};

export type TaskReminderRunStats = {
  dueNotified: number;
  overdueNotified: number;
};

export async function processTaskReminders(admin: SupabaseClient): Promise<TaskReminderRunStats> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const { data: tasks } = await admin
    .from("lead_tasks")
    .select(
      "id, lead_id, title, description, due_at, assigned_to, due_notified_at, overdue_notified_at",
    )
    .is("completed_at", null)
    .not("due_at", "is", null)
    .order("due_at", { ascending: true })
    .limit(100);

  if (!tasks?.length) return { dueNotified: 0, overdueNotified: 0 };

  const leadIds = [...new Set(tasks.map((t) => t.lead_id))];
  const { data: leads } = await admin.from("leads").select("id, inquiry_id, name").in("id", leadIds);
  const leadMap = new Map((leads ?? []).map((l) => [l.id, l]));

  let dueNotified = 0;
  let overdueNotified = 0;

  for (const task of tasks as TaskReminderRow[]) {
    if (!task.due_at) continue;
    const dueMs = new Date(task.due_at).getTime();
    if (Number.isNaN(dueMs)) continue;

    const lead = leadMap.get(task.lead_id);
    const label = lead?.name ? `${lead.name}: ${task.title}` : task.title;
    const href = `/staff/leads/${task.lead_id}`;

    if (dueMs <= now && !task.due_notified_at) {
      await notifyTask(admin, task, lead?.inquiry_id ?? null, {
        type: "follow_up.due",
        title: "Follow-up task due",
        message: label,
        href,
        dedupeKey: `follow_up.due:task:${task.id}`,
      });
      await admin.from("lead_tasks").update({ due_notified_at: nowIso }).eq("id", task.id);
      dueNotified += 1;
    }

    if (dueMs <= now - OVERDUE_AFTER_MS && !task.overdue_notified_at) {
      await notifyTask(admin, task, lead?.inquiry_id ?? null, {
        type: "follow_up.overdue",
        title: "Follow-up overdue",
        message: label,
        href,
        dedupeKey: `follow_up.overdue:task:${task.id}`,
      });
      await admin.from("lead_tasks").update({ overdue_notified_at: nowIso }).eq("id", task.id);
      overdueNotified += 1;
    }
  }

  return { dueNotified, overdueNotified };
}

async function notifyTask(
  admin: SupabaseClient,
  task: TaskReminderRow,
  inquiryId: string | null,
  input: {
    type: "follow_up.due" | "follow_up.overdue";
    title: string;
    message: string;
    href: string;
    dedupeKey: string;
  },
): Promise<void> {
  if (task.assigned_to) {
    await notifyStaff(
      {
        type: input.type,
        category: "follow_up",
        title: input.title,
        message: input.message,
        leadId: task.lead_id,
        inquiryId,
        href: input.href,
        dedupeKey: input.dedupeKey,
        recipientUserId: task.assigned_to,
      },
      admin,
    );
    return;
  }

  await notifyStaff(
    {
      type: input.type,
      category: "follow_up",
      title: input.title,
      message: input.message,
      leadId: task.lead_id,
      inquiryId,
      href: input.href,
      dedupeKey: input.dedupeKey,
    },
    admin,
  );
}
