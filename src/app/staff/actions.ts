"use server";

import { revalidatePath } from "next/cache";
import {
  attachEmailDeliveryToActivity,
  emailDeliveryLabel,
} from "@/crm/lead-conversation";
import { requireStaff } from "@/crm/guard";
import { isLeadPriority } from "@/crm/lead-priority";
import { parseTaskDueAt } from "@/crm/task-datetime";
import { isPipelineStage } from "@/crm/stages";
import { canRetryEvents } from "@/events/auth";
import { runEventWorker, runInquiryAutomation } from "@/events/run";
import type { CustomerReplyFormState } from "@/components/staff/lead-forms";

type ActionState = { error: string | null; success: string | null };

function revalidateLead(id: string) {
  revalidatePath("/staff");
  revalidatePath("/staff/leads");
  revalidatePath("/staff/pipeline");
  revalidatePath("/staff/follow-ups");
  revalidatePath(`/staff/leads/${id}`);
  revalidatePath("/account/inquiries");
}

async function audit(
  admin: NonNullable<Awaited<ReturnType<typeof requireStaff>>["admin"]>,
  leadId: string,
  actor: string,
  action: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  await admin.from("lead_audit").insert({
    lead_id: leadId,
    actor_user_id: actor,
    action,
    before_state: before,
    after_state: after,
  });
}

export async function updateLeadStageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff.admin) return { error: "Server is missing the service role key.", success: null };
  const id = String(formData.get("leadId") ?? "");
  const stage = String(formData.get("status") ?? "");
  const expected = Number(formData.get("version") ?? "0");
  if (!id || !isPipelineStage(stage)) return { error: "Invalid stage.", success: null };

  const { data, error } = await staff.admin.rpc("record_lead_stage_change", {
    p_lead_id: id,
    p_to_status: stage,
    p_expected_version: expected,
    p_actor: staff.userId,
  });
  if (error) {
    const message = error.message.includes("version conflict")
      ? "This lead was updated by someone else. Refresh and try again."
      : error.message;
    return { error: message, success: null };
  }
  if (data && typeof data === "object" && "unchanged" in data && data.unchanged) {
    return { error: null, success: "Stage already set." };
  }
  void runEventWorker("after-stage").catch(() => {});
  revalidateLead(id);
  return { error: null, success: "Stage updated." };
}

export async function updateLeadPriorityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff.admin) return { error: "Server is missing the service role key.", success: null };
  const id = String(formData.get("leadId") ?? "");
  const priority = String(formData.get("priority") ?? "");
  if (!id || !isLeadPriority(priority)) return { error: "Invalid priority.", success: null };

  const { data: current } = await staff.admin.from("leads").select("priority").eq("id", id).maybeSingle();
  if (!current) return { error: "Lead not found.", success: null };

  const { error } = await staff.admin.from("leads").update({ priority }).eq("id", id);
  if (error) return { error: error.message, success: null };

  await audit(staff.admin, id, staff.userId, "priority", { priority: current.priority }, { priority });
  revalidateLead(id);
  return { error: null, success: "Priority updated." };
}

export async function retryLeadHubSpotSyncAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff.admin) return { error: "Server is missing the service role key.", success: null };
  if (!canRetryEvents(staff.role)) return { error: "Only administrators can retry HubSpot sync.", success: null };

  const leadId = String(formData.get("leadId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(leadId) || !/^[0-9a-f-]{36}$/i.test(eventId)) {
    return { error: "Invalid lead or event.", success: null };
  }

  const { data: event } = await staff.admin
    .from("automation_events")
    .select("id, event_type, lead_id")
    .eq("id", eventId)
    .maybeSingle();
  if (
    !event ||
    event.lead_id !== leadId ||
    (event.event_type !== "lead.stage_changed" && event.event_type !== "inquiry.received")
  ) {
    return { error: "That event cannot be retried for this lead.", success: null };
  }

  const { error } = await staff.admin.rpc("retry_automation_event", { p_event_id: eventId });
  if (error) return { error: error.message, success: null };

  void runEventWorker("hubspot-retry").catch(() => {});
  revalidateLead(leadId);
  return {
    error: null,
    success:
      event.event_type === "inquiry.received"
        ? "Inquiry HubSpot sync re-queued. Duplicate deals are prevented by inquiry id mapping."
        : "HubSpot stage sync re-queued. Local lead data was not changed.",
  };
}

export async function assignLeadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff.admin) return { error: "Server is missing the service role key.", success: null };
  const id = String(formData.get("leadId") ?? "");
  const assignedTo = String(formData.get("assignedTo") ?? "").trim() || null;
  const expected = Number(formData.get("version") ?? "0");
  if (!id) return { error: "Missing lead.", success: null };

  if (assignedTo) {
    const { data: member } = await staff.admin
      .from("staff_members")
      .select("user_id")
      .eq("user_id", assignedTo)
      .maybeSingle();
    if (!member) return { error: "Assignee is not a staff member.", success: null };
  }

  const { data: current } = await staff.admin.from("leads").select("assigned_to, version").eq("id", id).maybeSingle();
  if (!current) return { error: "Lead not found.", success: null };
  if (current.version !== expected) {
    return { error: "This lead was updated by someone else. Refresh and try again.", success: null };
  }

  const { error } = await staff.admin
    .from("leads")
    .update({ assigned_to: assignedTo, version: current.version + 1 })
    .eq("id", id)
    .eq("version", expected);
  if (error) return { error: error.message, success: null };

  await staff.admin.from("lead_activities").insert({
    lead_id: id,
    actor_user_id: staff.userId,
    kind: "assignment",
    body: assignedTo ? `Assigned to ${assignedTo}` : "Unassigned",
  });
  await audit(
    staff.admin,
    id,
    staff.userId,
    "assignment",
    { assigned_to: current.assigned_to },
    { assigned_to: assignedTo },
  );
  revalidateLead(id);
  return { error: null, success: "Assignment saved." };
}

export async function addLeadNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff.admin) return { error: "Server is missing the service role key.", success: null };
  const id = String(formData.get("leadId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!id || body.length < 2 || body.length > 2000) {
    return { error: "Note must be 2–2000 characters.", success: null };
  }
  const { error } = await staff.admin.from("lead_activities").insert({
    lead_id: id,
    actor_user_id: staff.userId,
    kind: "note",
    body,
  });
  if (error) return { error: error.message, success: null };
  await audit(staff.admin, id, staff.userId, "note", {}, { body: body.slice(0, 200) });
  revalidateLead(id);
  return { error: null, success: "Note recorded." };
}

export async function createTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff.admin) return { error: "Server is missing the service role key.", success: null };
  const leadId = String(formData.get("leadId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000) || null;
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const dueTime = String(formData.get("dueTime") ?? "").trim();
  const dueAt = dueDate ? parseTaskDueAt(dueDate, dueTime) : null;
  if (dueDate && !dueAt) return { error: "Invalid due date or time.", success: null };
  const assignedTo = String(formData.get("assignedTo") ?? "").trim() || staff.userId;
  if (!leadId || title.length < 2 || title.length > 160) {
    return { error: "Task title must be 2–160 characters.", success: null };
  }
  if (assignedTo) {
    const { data: member } = await staff.admin
      .from("staff_members")
      .select("user_id")
      .eq("user_id", assignedTo)
      .maybeSingle();
    if (!member) return { error: "Assignee must be a staff member.", success: null };
  }
  const { error } = await staff.admin.from("lead_tasks").insert({
    lead_id: leadId,
    title,
    description,
    due_at: dueAt,
    assigned_to: assignedTo,
    created_by: staff.userId,
  });
  if (error) return { error: error.message, success: null };
  await staff.admin.from("lead_activities").insert({
    lead_id: leadId,
    actor_user_id: staff.userId,
    kind: "task_created",
    body: description ? `${title} — ${description.slice(0, 120)}` : title,
  });
  revalidateLead(leadId);
  return { error: null, success: "Follow-up task created." };
}

export async function rescheduleTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff.admin) return { error: "Server is missing the service role key.", success: null };
  const taskId = String(formData.get("taskId") ?? "");
  const leadId = String(formData.get("leadId") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const dueTime = String(formData.get("dueTime") ?? "").trim();
  const dueAt = dueDate ? parseTaskDueAt(dueDate, dueTime) : null;
  if (!taskId || !leadId || !dueAt) return { error: "Task, lead, and valid due date are required.", success: null };

  const { data: task } = await staff.admin
    .from("lead_tasks")
    .select("id, completed_at")
    .eq("id", taskId)
    .eq("lead_id", leadId)
    .maybeSingle();
  if (!task) return { error: "Task not found.", success: null };
  if (task.completed_at) return { error: "Completed tasks cannot be rescheduled.", success: null };

  const { error } = await staff.admin
    .from("lead_tasks")
    .update({
      due_at: dueAt,
      due_notified_at: null,
      overdue_notified_at: null,
    })
    .eq("id", taskId);
  if (error) return { error: error.message, success: null };

  await staff.admin.from("lead_activities").insert({
    lead_id: leadId,
    actor_user_id: staff.userId,
    kind: "task_rescheduled",
    body: `Due ${dueAt}`,
  });
  revalidateLead(leadId);
  return { error: null, success: "Task rescheduled." };
}

export async function sendCustomerFollowUpAction(
  _prev: CustomerReplyFormState,
  formData: FormData,
): Promise<CustomerReplyFormState> {
  const empty: CustomerReplyFormState = {
    error: null,
    success: null,
    emailStatus: null,
    inAppNotified: false,
  };
  const staff = await requireStaff();
  if (!staff.admin) return { ...empty, error: "Server is missing the service role key." };
  const leadId = String(formData.get("leadId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const confirmed = String(formData.get("confirm") ?? "") === "yes";
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return { ...empty, error: "Invalid lead." };
  if (body.length < 10 || body.length > 4000) {
    return { ...empty, error: "Message must be 10–4000 characters." };
  }
  if (!confirmed) return { ...empty, error: "Confirm before sending to the customer." };

  const { data: lead, error: leadError } = await staff.admin
    .from("leads")
    .select("id, inquiry_id, email, name, user_id, vehicle_slug")
    .eq("id", leadId)
    .maybeSingle();
  if (leadError || !lead?.inquiry_id) return { ...empty, error: "Lead or linked inquiry not found." };

  const { data: activity, error: activityError } = await staff.admin
    .from("lead_activities")
    .insert({
      lead_id: leadId,
      actor_user_id: staff.userId,
      kind: "customer_follow_up",
      body,
    })
    .select("id")
    .single();
  if (activityError || !activity) return { ...empty, error: activityError?.message ?? "Could not save reply." };

  await staff.admin.from("inquiries").update({ status: "reviewed" }).eq("id", lead.inquiry_id);

  if (lead.user_id) {
    await staff.admin.from("customer_notifications").insert({
      user_id: lead.user_id,
      inquiry_id: lead.inquiry_id,
      lead_id: leadId,
      title: "Reply from FormShift AI",
      body,
    });
  }

  const { data: eventId, error: enqueueError } = await staff.admin.rpc("enqueue_automation_event", {
    p_event_type: "inquiry.staff_reply",
    p_entity_type: "inquiry",
    p_entity_id: lead.inquiry_id,
    p_lead_id: leadId,
    p_payload: {
      inquiry_id: lead.inquiry_id,
      lead_id: leadId,
      activity_id: activity.id,
      vehicle_slug: lead.vehicle_slug,
    },
    p_idempotency_key: `inquiry.staff_reply:${activity.id}`,
    p_next_attempt_at: new Date().toISOString(),
  });
  if (enqueueError) return { ...empty, error: enqueueError.message };

  const resolvedEventId = typeof eventId === "string" ? eventId : null;

  try {
    const worker = await runInquiryAutomation(resolvedEventId, "staff-reply");
    if (worker.error) {
      const delivery = await attachEmailDeliveryToActivity(staff.admin, activity.id, resolvedEventId);
      return {
        error: null,
        success: "Reply saved to the conversation.",
        emailStatus: "Email worker could not run — check SUPABASE_SERVICE_ROLE_KEY on the server.",
        inAppNotified: Boolean(lead.user_id),
      };
    }
  } catch {
    const delivery = await attachEmailDeliveryToActivity(staff.admin, activity.id, resolvedEventId);
    return {
      error: null,
      success: "Reply saved to the conversation.",
      emailStatus: emailDeliveryLabel(delivery) ?? "Email status pending — check Integrations.",
      inAppNotified: Boolean(lead.user_id),
    };
  }

  const delivery = await attachEmailDeliveryToActivity(staff.admin, activity.id, resolvedEventId);

  await audit(staff.admin, leadId, staff.userId, "customer_follow_up", {}, { length: body.length });
  revalidateLead(leadId);
  return {
    error: null,
    success: "Reply saved to the conversation timeline.",
    emailStatus: emailDeliveryLabel(delivery),
    inAppNotified: Boolean(lead.user_id),
  };
}

export async function completeTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff.admin) return { error: "Server is missing the service role key.", success: null };
  const taskId = String(formData.get("taskId") ?? "");
  const leadId = String(formData.get("leadId") ?? "");
  if (!taskId || !leadId) return { error: "Missing task.", success: null };
  const { error } = await staff.admin
    .from("lead_tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .is("completed_at", null);
  if (error) return { error: error.message, success: null };
  await staff.admin.from("lead_activities").insert({
    lead_id: leadId,
    actor_user_id: staff.userId,
    kind: "task_completed",
    body: taskId,
  });
  revalidateLead(leadId);
  return { error: null, success: "Task marked complete." };
}
