import type { SupabaseClient } from "@supabase/supabase-js";
import { integrationHealth, loadIntegrationConfig } from "@/events/config";
import { staffDisplayError } from "@/events/log";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/supabase/env";
import { hubspotPortalIdFromEnv } from "@/crm/hubspot-links";
import type { IntegrationCard } from "@/crm/integration-snapshot";
import { loadIntegrationSnapshot } from "@/crm/integration-snapshot";

export type MonitorChannelState = "healthy" | "degraded" | "down" | "idle" | "unconfigured";

export type MonitorChannel = {
  key: "supabase" | "hubspot" | "resend_customer" | "resend_staff" | "worker";
  title: string;
  state: MonitorChannelState;
  configured: boolean;
  pendingEvents: number;
  failedDeliveriesSample: number;
  succeededDeliveriesSample: number;
  lastSuccessAt: string | null;
  lastError: string | null;
  notes: string[];
};

export type MonitorEventRow = {
  id: string;
  event_type: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  created_at: string;
  next_attempt_at: string | null;
  canRetry: boolean;
};

export type MonitorDeliveryRow = {
  event_id: string;
  integration: string;
  integrationLabel: string;
  status: string;
  attempt_count: number;
  retryable: boolean | null;
  last_error: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type IntegrationMonitoringSnapshot = {
  loadedAt: string;
  cards: IntegrationCard[];
  configFlags: {
    supabasePublicConfigured: boolean;
    serviceRoleConfigured: boolean;
    supabaseReachable: boolean;
    supabaseProbeError: string | null;
    hubspotTokenConfigured: boolean;
    hubspotStagesMapped: number;
    hubspotPortalConfigured: boolean;
    resendConfigured: boolean;
    resendInternalConfigured: boolean;
    resendDryRun: boolean;
    workerAuthConfigured: boolean;
  };
  worker: {
    queued: number;
    processing: number;
    failedOrDead: number;
    succeeded: number;
    lastSuccessAt: string | null;
    lastError: string | null;
  };
  channels: MonitorChannel[];
  failedEvents: MonitorEventRow[];
  recentEvents: MonitorEventRow[];
  deliveries: MonitorDeliveryRow[];
  customerDeliveries: MonitorDeliveryRow[];
  staffDeliveries: MonitorDeliveryRow[];
};

const RETRYABLE_EVENT_STATUSES = new Set(["failed", "dead", "processing"]);

function deliveryLabel(integration: string): string {
  if (integration === "resend") return "Customer email (Resend)";
  if (integration === "resend_staff") return "Staff notification (Resend)";
  if (integration === "hubspot") return "HubSpot";
  if (integration === "internal") return "Internal CRM task";
  return integration;
}

function lastForIntegration(
  rows: Array<{
    integration: string;
    status: string;
    completed_at: string | null;
    updated_at: string;
    last_error: string | null;
  }>,
  integrations: string[],
) {
  const filtered = rows.filter((r) => integrations.includes(r.integration));
  const succeeded = filtered.filter((r) => r.status === "succeeded");
  const failed = filtered.filter((r) => r.status === "failed");
  const lastSuccess = succeeded
    .map((r) => r.completed_at ?? r.updated_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
  const lastFail = failed
    .map((r) => ({ at: r.updated_at, err: r.last_error }))
    .filter((r) => r.at)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  return {
    succeeded: succeeded.length,
    failed: failed.length,
    lastSuccessAt: lastSuccess,
    lastError: staffDisplayError(lastFail?.err ?? null),
  };
}

function channelState(input: {
  configured: boolean;
  failed: number;
  succeeded: number;
  pending: number;
  processing: number;
}): MonitorChannelState {
  if (!input.configured) return "unconfigured";
  if (input.pending > 0 || input.processing > 0) return "degraded";
  if (input.failed > 0 && input.succeeded === 0) return "down";
  if (input.failed > 0) return "degraded";
  if (input.succeeded > 0) return "healthy";
  return "idle";
}

export async function loadIntegrationMonitoring(admin: SupabaseClient): Promise<IntegrationMonitoringSnapshot> {
  const loadedAt = new Date().toISOString();
  const config = loadIntegrationConfig();
  const health = integrationHealth(config);
  const serviceRoleConfigured = isServiceRoleConfigured();
  const supabasePublicConfigured = isSupabaseConfigured();

  const probe = await admin.from("automation_events").select("id", { count: "exact", head: true }).limit(1);

  const now = loadedAt;
  const [
    cards,
    queued,
    processing,
    failedCount,
    succeededCount,
    { data: failedEventsRaw },
    { data: recentEventsRaw },
    { data: recentDeliveries },
    { data: lastSuccessEvent },
    { data: lastFailedEvent },
  ] = await Promise.all([
    loadIntegrationSnapshot(admin, config, { serviceRolePresent: serviceRoleConfigured }),
    admin.from("automation_events").select("id", { count: "exact", head: true }).eq("status", "queued"),
    admin.from("automation_events").select("id", { count: "exact", head: true }).eq("status", "processing"),
    admin.from("automation_events").select("id", { count: "exact", head: true }).in("status", ["failed", "dead"]),
    admin.from("automation_events").select("id", { count: "exact", head: true }).eq("status", "succeeded"),
    admin
      .from("automation_events")
      .select("id, event_type, status, attempt_count, max_attempts, last_error, created_at, next_attempt_at")
      .in("status", ["failed", "dead"])
      .order("created_at", { ascending: false })
      .limit(60),
    admin
      .from("automation_events")
      .select("id, event_type, status, attempt_count, max_attempts, last_error, created_at, next_attempt_at")
      .order("created_at", { ascending: false })
      .limit(25),
    admin
      .from("automation_event_deliveries")
      .select(
        "event_id, integration, status, attempt_count, retryable, last_error, completed_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(80),
    admin
      .from("automation_events")
      .select("completed_at")
      .eq("status", "succeeded")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("automation_events")
      .select("last_error, updated_at")
      .in("status", ["failed", "dead"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const deliveriesRaw = recentDeliveries ?? [];
  const hubspot = lastForIntegration(deliveriesRaw, ["hubspot"]);
  const resendCustomer = lastForIntegration(deliveriesRaw, ["resend"]);
  const resendStaff = lastForIntegration(deliveriesRaw, ["resend_staff"]);
  const internal = lastForIntegration(deliveriesRaw, ["internal"]);

  const queuedN = queued.count ?? 0;
  const processingN = processing.count ?? 0;

  const channels: MonitorChannel[] = [
    {
      key: "supabase",
      title: "Supabase",
      configured: supabasePublicConfigured && serviceRoleConfigured,
      state: probe.error
        ? "down"
        : serviceRoleConfigured
          ? "healthy"
          : supabasePublicConfigured
            ? "degraded"
            : "unconfigured",
      pendingEvents: 0,
      failedDeliveriesSample: 0,
      succeededDeliveriesSample: 0,
      lastSuccessAt: probe.error ? null : loadedAt,
      lastError: staffDisplayError(probe.error?.message ?? null),
      notes: [
        "Public anon key configured (name only — values never shown here).",
        serviceRoleConfigured ? "Service role present for staff CRM reads." : "SUPABASE_SERVICE_ROLE_KEY missing on server.",
        probe.error ? "Database probe failed." : "Database probe succeeded.",
      ],
    },
    {
      key: "hubspot",
      title: "HubSpot sync",
      configured: health.hubspot,
      state: channelState({
        configured: health.hubspot,
        failed: hubspot.failed,
        succeeded: hubspot.succeeded,
        pending: queuedN,
        processing: processingN,
      }),
      pendingEvents: queuedN,
      failedDeliveriesSample: hubspot.failed,
      succeededDeliveriesSample: hubspot.succeeded,
      lastSuccessAt: hubspot.lastSuccessAt,
      lastError: hubspot.lastError,
      notes: [
        `${health.hubspotStagesConfigured}/7 pipeline stages mapped in environment.`,
        hubspotPortalIdFromEnv() ? "HUBSPOT_PORTAL_ID set for record links." : "HUBSPOT_PORTAL_ID not set.",
        "Deal deduplication uses inquiry id in integration_mappings.",
      ],
    },
    {
      key: "resend_customer",
      title: "Customer email (Resend)",
      configured: health.resend,
      state: channelState({
        configured: health.resend && !health.dryRun,
        failed: resendCustomer.failed,
        succeeded: resendCustomer.succeeded,
        pending: 0,
        processing: 0,
      }),
      pendingEvents: 0,
      failedDeliveriesSample: resendCustomer.failed,
      succeededDeliveriesSample: resendCustomer.succeeded,
      lastSuccessAt: resendCustomer.lastSuccessAt,
      lastError: resendCustomer.lastError,
      notes: [
        health.dryRun ? "INTEGRATIONS_DRY_RUN blocks live customer email." : "Dry run off.",
        "Failures here do not block staff notification attempts (separate delivery row).",
        "Succeeded means Resend accepted the message — not inbox delivery.",
      ],
    },
    {
      key: "resend_staff",
      title: "Staff notification (Resend)",
      configured: health.resend && health.resendInternalConfigured,
      state: channelState({
        configured: health.resend && health.resendInternalConfigured && !health.dryRun,
        failed: resendStaff.failed,
        succeeded: resendStaff.succeeded,
        pending: 0,
        processing: 0,
      }),
      pendingEvents: 0,
      failedDeliveriesSample: resendStaff.failed,
      succeededDeliveriesSample: resendStaff.succeeded,
      lastSuccessAt: resendStaff.lastSuccessAt,
      lastError: resendStaff.lastError,
      notes: [
        health.resendInternalConfigured ? "RESEND_INTERNAL_TO configured." : "Staff inbox not configured — skips.",
        "Independent from customer email delivery.",
      ],
    },
    {
      key: "worker",
      title: "Event worker",
      configured: health.workerAuthConfigured,
      state: channelState({
        configured: health.workerAuthConfigured,
        failed: failedCount.count ?? 0,
        succeeded: internal.succeeded,
        pending: queuedN,
        processing: processingN,
      }),
      pendingEvents: queuedN + processingN,
      failedDeliveriesSample: failedCount.count ?? 0,
      succeededDeliveriesSample: succeededCount.count ?? 0,
      lastSuccessAt: lastSuccessEvent?.completed_at ?? null,
      lastError: staffDisplayError(lastFailedEvent?.last_error ?? null),
      notes: [
        "Cron: Vercel 06:00 UTC → /api/internal/events/process when CRON_SECRET is set.",
        `Internal follow-up tasks (sample): ${internal.succeeded} succeeded, ${internal.failed} failed.`,
        `Snapshot time: ${now}`,
      ],
    },
  ];

  const mapEvent = (row: {
    id: string;
    event_type: string;
    status: string;
    attempt_count: number | null;
    max_attempts: number | null;
    last_error: string | null;
    created_at: string;
    next_attempt_at: string | null;
  }): MonitorEventRow => ({
    id: row.id,
    event_type: row.event_type,
    status: row.status,
    attempt_count: row.attempt_count ?? 0,
    max_attempts: row.max_attempts ?? 8,
    last_error: staffDisplayError(row.last_error),
    created_at: row.created_at,
    next_attempt_at: row.next_attempt_at,
    canRetry: RETRYABLE_EVENT_STATUSES.has(row.status),
  });

  const deliveries: MonitorDeliveryRow[] = (deliveriesRaw ?? []).map((row) => ({
    event_id: row.event_id,
    integration: row.integration,
    integrationLabel: deliveryLabel(row.integration),
    status: row.status,
    attempt_count: row.attempt_count ?? 0,
    retryable: row.retryable ?? null,
    last_error: staffDisplayError(row.last_error),
    completed_at: row.completed_at,
    updated_at: row.updated_at,
  }));

  return {
    loadedAt,
    cards,
    configFlags: {
      supabasePublicConfigured,
      serviceRoleConfigured,
      supabaseReachable: !probe.error,
      supabaseProbeError: staffDisplayError(probe.error?.message ?? null),
      hubspotTokenConfigured: health.hubspot,
      hubspotStagesMapped: health.hubspotStagesConfigured,
      hubspotPortalConfigured: Boolean(hubspotPortalIdFromEnv()),
      resendConfigured: health.resend,
      resendInternalConfigured: health.resendInternalConfigured,
      resendDryRun: health.dryRun,
      workerAuthConfigured: health.workerAuthConfigured,
    },
    worker: {
      queued: queuedN,
      processing: processingN,
      failedOrDead: failedCount.count ?? 0,
      succeeded: succeededCount.count ?? 0,
      lastSuccessAt: lastSuccessEvent?.completed_at ?? null,
      lastError: staffDisplayError(lastFailedEvent?.last_error ?? null),
    },
    channels,
    failedEvents: (failedEventsRaw ?? []).map(mapEvent),
    recentEvents: (recentEventsRaw ?? []).map(mapEvent),
    deliveries,
    customerDeliveries: deliveries.filter((d) => d.integration === "resend"),
    staffDeliveries: deliveries.filter((d) => d.integration === "resend_staff"),
  };
}
