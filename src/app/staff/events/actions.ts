"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/crm/guard";
import { canRetryEvents } from "@/events/auth";
import { runEventWorker } from "@/events/run";
import { loadIntegrationConfig } from "@/events/config";
import { verifyHubspotToken } from "@/crm/hubspot-verify";
import { staffDisplayError } from "@/events/log";
import { validEmail } from "@/lib/validation";

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
  revalidatePath("/staff");
  if (result.error) return { error: "Worker could not run. Check the service role key.", success: null };
  return { error: null, success: `Processed ${result.processed} of ${result.claimed} claimed events.` };
}

export async function verifyHubspotAction(_prev: ActionState): Promise<ActionState> {
  const staff = await requireStaff("/staff/events");
  if (!canRetryEvents(staff.role)) return { error: "Only administrators can verify HubSpot.", success: null };
  const result = await verifyHubspotToken(loadIntegrationConfig());
  revalidatePath("/staff/events");
  if (!result.ok) return { error: result.message, success: null };
  return { error: null, success: result.message };
}

export async function sendResendTestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaff("/staff/events");
  if (!canRetryEvents(staff.role)) {
    return { error: "Only administrators can send test email.", success: null };
  }
  if (String(formData.get("confirm") ?? "") !== "yes") {
    return { error: "Confirm the test send first.", success: null };
  }

  const config = loadIntegrationConfig();
  const approved = process.env.RESEND_TEST_RECIPIENT?.trim() ?? "";
  const requested = String(formData.get("recipient") ?? "").trim();
  if (!approved || !validEmail(approved)) {
    return { error: "RESEND_TEST_RECIPIENT is not configured.", success: null };
  }
  if (requested !== approved) {
    return { error: "Recipient does not match the approved test inbox.", success: null };
  }
  if (config.dryRun) {
    return { error: "INTEGRATIONS_DRY_RUN is enabled — live sends are blocked.", success: null };
  }
  if (!config.resendApiKey || !config.resendFrom || !validEmail(config.resendFrom)) {
    return { error: "Resend is not fully configured.", success: null };
  }
  if (process.env.NODE_ENV === "test") {
    return { error: "Test sends are disabled in the test environment.", success: null };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: config.resendFrom,
        to: [approved],
        subject: "FormShift AI — staff Resend test",
        text: "This is a deliberate staff test from the integrations page. Delivery to the inbox is not guaranteed.",
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      const safe = staffDisplayError(`Resend HTTP ${response.status}: ${text}`, 200);
      return { error: safe ?? "Resend request failed.", success: null };
    }
    return {
      error: null,
      success: "Resend accepted the test message. Check the recipient inbox — acceptance is not proof of delivery.",
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Resend request failed.", success: null };
  }
}
