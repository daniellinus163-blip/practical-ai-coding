"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/crm/guard";
import { isPipelineStage } from "@/crm/stages";
import { runEventWorker } from "@/events/run";

type ActionState = { error: string | null; success: string | null };

function revalidateLead(id: string) {
  revalidatePath("/staff");
  revalidatePath("/staff/leads");
  revalidatePath("/staff/pipeline");
  revalidatePath(`/staff/leads/${id}`);
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
  const dueAt = String(formData.get("dueAt") ?? "").trim() || null;
  const assignedTo = String(formData.get("assignedTo") ?? "").trim() || staff.userId;
  if (!leadId || title.length < 2 || title.length > 160) {
    return { error: "Task title must be 2–160 characters.", success: null };
  }
  const { error } = await staff.admin.from("lead_tasks").insert({
    lead_id: leadId,
    title,
    due_at: dueAt,
    assigned_to: assignedTo,
    created_by: staff.userId,
  });
  if (error) return { error: error.message, success: null };
  await staff.admin.from("lead_activities").insert({
    lead_id: leadId,
    actor_user_id: staff.userId,
    kind: "task_created",
    body: title,
  });
  revalidateLead(leadId);
  return { error: null, success: "Task added." };
}

export async function completeTaskAction(formData: FormData) {
  const staff = await requireStaff();
  if (!staff.admin) return;
  const taskId = String(formData.get("taskId") ?? "");
  const leadId = String(formData.get("leadId") ?? "");
  if (!taskId || !leadId) return;
  await staff.admin.from("lead_tasks").update({ completed_at: new Date().toISOString() }).eq("id", taskId);
  await staff.admin.from("lead_activities").insert({
    lead_id: leadId,
    actor_user_id: staff.userId,
    kind: "task_completed",
    body: taskId,
  });
  revalidateLead(leadId);
}
