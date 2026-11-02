"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/crm/guard";
import { canRetryEvents } from "@/events/auth";
import { runEventWorker } from "@/events/run";

type ActionState = { error: string | null; success: string | null };

export async function retryEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireStaff("/staff/events");
  if (!canRetryEvents(staff.role)) return { error: "Only administrators can retry events.", success: null };
  if (!staff.admin) return { error: "Server is missing the service role key.", success: null };
  const id = String(formData.get("eventId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Invalid event.", success: null };
  const { data, error } = await staff.admin.rpc("retry_automation_event", { p_event_id: id });
  if (error) return { error: error.message, success: null };
  if (!data) return { error: "This event cannot be retried.", success: null };
  void runEventWorker("staff-retry").catch(() => {});
  revalidatePath("/staff/events");
  return { error: null, success: "Retry queued." };
}

export async function processEventsNowAction(_prev: ActionState, _formData?: FormData): Promise<ActionState> {
  const staff = await requireStaff("/staff/events");
  if (!canRetryEvents(staff.role)) return { error: "Only administrators can run the worker.", success: null };
  const result = await runEventWorker("staff-run");
  revalidatePath("/staff/events");
  if (result.error) return { error: "Worker could not run. Check the service role key.", success: null };
  return { error: null, success: `Processed ${result.processed} of ${result.claimed} claimed events.` };
}
