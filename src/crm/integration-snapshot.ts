import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntegrationConfig } from "@/events/config";
import { integrationHealth } from "@/events/config";

export type IntegrationCardState =
  | "connected"
  | "configured_unverified"
  | "processing"
  | "partial"
  | "action_required"
  | "failed";

export type IntegrationCard = {
  key: "supabase" | "hubspot" | "resend" | "worker";
  title: string;
  state: IntegrationCardState;
  summary: string;
  details: string[];
};

function deliveryStats(
  rows: Array<{ integration: string; status: string; completed_at: string | null; updated_at: string }>,
  integrations: string[],
) {
  const filtered = rows.filter((r) => integrations.includes(r.integration));
  const succeeded = filtered.filter((r) => r.status === "succeeded");
  const failed = filtered.filter((r) => r.status === "failed");
  const last = filtered
    .map((r) => r.completed_at ?? r.updated_at)
    .filter(Boolean)
    .sort()
    .at(-1);
  return { succeeded: succeeded.length, failed: failed.length, last: last ?? null };
}

export async function loadIntegrationSnapshot(
  admin: SupabaseClient,
  config: IntegrationConfig,
  options: { serviceRolePresent: boolean },
): Promise<IntegrationCard[]> {
  const health = integrationHealth(config);
  const now = new Date().toISOString();

  const [
    { count: queued },
    { count: processing },
    { count: failedEvents },
    { data: recentDeliveries },
    { data: lastSuccessEvent },
  ] = await Promise.all([
    admin.from("automation_events").select("id", { count: "exact", head: true }).eq("status", "queued"),
    admin.from("automation_events").select("id", { count: "exact", head: true }).eq("status", "processing"),
    admin
      .from("automation_events")
      .select("id", { count: "exact", head: true })
      .in("status", ["failed", "dead"]),
    admin
      .from("automation_event_deliveries")
      .select("integration, status, completed_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(120),
    admin
      .from("automation_events")
      .select("completed_at")
      .eq("status", "succeeded")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const deliveries = recentDeliveries ?? [];
  const hubspotStats = deliveryStats(deliveries, ["hubspot"]);
  const resendCustomer = deliveryStats(deliveries, ["resend"]);
  const resendStaff = deliveryStats(deliveries, ["resend_staff"]);
  const internalStats = deliveryStats(deliveries, ["internal"]);

  const workerBusy = (queued ?? 0) > 0 || (processing ?? 0) > 0;
  const workerFailed = (failedEvents ?? 0) > 0;

  const supabase: IntegrationCard = {
    key: "supabase",
    title: "Supabase",
    state: options.serviceRolePresent ? "connected" : "action_required",
    summary: options.serviceRolePresent
      ? "Service role present — staff reads use server-side access."
      : "Service role key missing on the server.",
    details: [
      `Queued automation events: ${queued ?? 0}`,
      `Processing: ${processing ?? 0}`,
      lastSuccessEvent?.completed_at
        ? `Last succeeded event: ${lastSuccessEvent.completed_at}`
        : "No succeeded automation events recorded yet.",
    ],
  };

  let hubspotState: IntegrationCardState = "configured_unverified";
  if (!health.hubspot) hubspotState = "action_required";
  else if (hubspotStats.failed > 0 && hubspotStats.succeeded === 0) hubspotState = "failed";
  else if (hubspotStats.failed > 0) hubspotState = "partial";
  else if (hubspotStats.succeeded > 0) hubspotState = "connected";
  else if (workerBusy) hubspotState = "processing";

  const hubspot: IntegrationCard = {
    key: "hubspot",
    title: "HubSpot CRM",
    state: hubspotState,
    summary: health.hubspot
      ? `${health.hubspotStagesConfigured}/7 pipeline stages mapped in environment.`
      : "HUBSPOT_ACCESS_TOKEN not set.",
    details: [
      hubspotStats.last ? `Last HubSpot delivery activity: ${hubspotStats.last}` : "No HubSpot deliveries logged yet.",
      `Recent sample — succeeded: ${hubspotStats.succeeded}, failed: ${hubspotStats.failed} (last ${deliveries.length} delivery rows).`,
      "Open-in-HubSpot links require HUBSPOT_PORTAL_ID plus stored record IDs.",
    ],
  };

  let resendState: IntegrationCardState = "configured_unverified";
  if (!health.resend) resendState = "action_required";
  else if (health.dryRun) resendState = "configured_unverified";
  else if (resendCustomer.failed > 0 && resendStaff.succeeded > 0) resendState = "partial";
  else if (resendCustomer.failed > 0 && resendStaff.failed > 0) resendState = "failed";
  else if (resendCustomer.succeeded > 0 || resendStaff.succeeded > 0) resendState = "connected";

  const resend: IntegrationCard = {
    key: "resend",
    title: "Resend email",
    state: resendState,
    summary: health.dryRun
      ? "Dry run enabled — API calls are skipped."
      : health.resendTestSender
        ? "Test sender domain — customer delivery is limited by Resend rules."
        : health.resend
          ? "Sender and API key configured."
          : "Resend not fully configured.",
    details: [
      `Customer emails (sample): ${resendCustomer.succeeded} accepted, ${resendCustomer.failed} failed.`,
      `Staff notifications (sample): ${resendStaff.succeeded} accepted, ${resendStaff.failed} failed.`,
      health.resendInternalConfigured
        ? "Staff inbox configured."
        : "RESEND_INTERNAL_TO missing — staff notifications will skip.",
      "Succeeded means Resend accepted the message, not guaranteed inbox delivery.",
    ],
  };

  let workerState: IntegrationCardState = "configured_unverified";
  if (!health.workerAuthConfigured) workerState = "action_required";
  else if (workerFailed) workerState = "failed";
  else if (workerBusy) workerState = "processing";
  else if (internalStats.succeeded > 0 || lastSuccessEvent?.completed_at) workerState = "connected";

  const worker: IntegrationCard = {
    key: "worker",
    title: "Follow-up worker",
    state: workerState,
    summary: health.workerAuthConfigured
      ? "Worker route auth configured (CRON_SECRET or EVENTS_WORKER_SECRET)."
      : "Set CRON_SECRET or EVENTS_WORKER_SECRET for scheduled processing.",
    details: [
      `Failed/dead events: ${failedEvents ?? 0}`,
      `Follow-up internal tasks (sample): ${internalStats.succeeded} succeeded, ${internalStats.failed} failed.`,
      "Production schedule: Vercel cron 06:00 UTC → /api/internal/events/process (verify in deployment).",
      `As of server time: ${now}`,
    ],
  };

  return [supabase, hubspot, resend, worker];
}
