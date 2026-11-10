import { Suspense } from "react";
import { connection } from "next/server";
import { requireStaff } from "@/crm/guard";
import { loadIntegrationMonitoring } from "@/crm/integration-monitoring";
import { canRetryEvents } from "@/events/auth";
import { loadIntegrationConfig } from "@/events/config";
import { EmptyState } from "@/components/catalog/empty-state";
import {
  IntegrationChannelGrid,
  IntegrationDeliveryLog,
  IntegrationEventLog,
  IntegrationHealthSection,
  IntegrationMonitoringOverview,
} from "@/components/staff/integration-monitoring";
import { EventsRetryControls } from "@/components/staff/events-retry-controls";
import { HubspotVerifyForm } from "@/components/staff/hubspot-verify-form";
import { ResendTestForm } from "@/components/staff/resend-test-form";
import { StaffPageHeader } from "@/components/staff/staff-ui";

export const metadata = { title: "Integration monitoring" };

export default function StaffEventsPage() {
  return (
    <Suspense fallback={<p className="px-4 py-12 text-sm">Loading integration status…</p>}>
      <StaffEventsBody />
    </Suspense>
  );
}

async function StaffEventsBody() {
  await connection();
  const staff = await requireStaff("/staff/events");
  const db = staff.admin;
  if (!db) {
    return (
      <EmptyState title="Monitoring locked" body="Set the service role key to read automation events and deliveries." />
    );
  }

  const snapshot = await loadIntegrationMonitoring(db);
  const admin = canRetryEvents(staff.role);
  const config = loadIntegrationConfig();
  const testRecipient = process.env.RESEND_TEST_RECIPIENT?.trim() || null;

  return (
    <div className="space-y-10">
        <StaffPageHeader
          title="Integration monitoring"
          description="Live health from Supabase automation tables and configuration flags. Secrets are never shown — only whether required settings are present."
        />
        <p className="-mt-4 text-xs text-[var(--muted)]">Snapshot: {formatWhen(snapshot.loadedAt)}</p>

        <section className="space-y-3">
          <h3 className="font-display text-xl">Event worker queue</h3>
          <IntegrationMonitoringOverview snapshot={snapshot} />
          <p className="text-sm">
            Last successful event:{" "}
            <strong>{snapshot.worker.lastSuccessAt ? formatWhen(snapshot.worker.lastSuccessAt) : "none yet"}</strong>
          </p>
          {snapshot.worker.lastError ? (
            <p className="text-sm text-[var(--danger)]">Last worker error: {snapshot.worker.lastError}</p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h3 className="font-display text-xl">Channel health</h3>
          <IntegrationChannelGrid channels={snapshot.channels} />
          <dl className="grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2 lg:grid-cols-3">
            <Flag label="Supabase public" ok={snapshot.configFlags.supabasePublicConfigured} />
            <Flag label="Service role" ok={snapshot.configFlags.serviceRoleConfigured} />
            <Flag label="DB reachable" ok={snapshot.configFlags.supabaseReachable} />
            <Flag label="HubSpot token" ok={snapshot.configFlags.hubspotTokenConfigured} />
            <Flag label="HubSpot portal id" ok={snapshot.configFlags.hubspotPortalConfigured} />
            <Flag label="Resend" ok={snapshot.configFlags.resendConfigured} />
            <Flag label="Staff inbox" ok={snapshot.configFlags.resendInternalConfigured} />
            <Flag label="Worker auth" ok={snapshot.configFlags.workerAuthConfigured} />
            <Flag label="Dry run off" ok={!snapshot.configFlags.resendDryRun} />
          </dl>
          {snapshot.configFlags.supabaseProbeError ? (
            <p className="text-sm text-[var(--danger)]">Probe: {snapshot.configFlags.supabaseProbeError}</p>
          ) : null}
        </section>

        <IntegrationHealthSection snapshot={snapshot} />

        {admin ? (
          <section className="staff-card space-y-4">
            <h3 className="font-display text-xl">Administrator actions</h3>
            <EventsRetryControls />
            <HubspotVerifyForm />
            <ResendTestForm allowedRecipient={testRecipient} />
            <p className="text-xs text-[var(--muted)]">
              HubSpot verify uses the server token but does not display it. Resend test only sends to RESEND_TEST_RECIPIENT.
              Sender: {config.resendFrom ? maskedSender(config.resendFrom) : "not set"}.
            </p>
          </section>
        ) : (
          <p className="text-sm text-[var(--muted)]">Only administrators can retry events or run verification sends.</p>
        )}

        <IntegrationEventLog
          failedEvents={snapshot.failedEvents}
          recentEvents={snapshot.recentEvents}
          admin={admin}
        />

        <section>
          <h3 className="font-display text-xl">Delivery log</h3>
          <IntegrationDeliveryLog
            customerDeliveries={snapshot.customerDeliveries}
            staffDeliveries={snapshot.staffDeliveries}
            allDeliveries={snapshot.deliveries}
          />
        </section>
    </div>
  );
}

function Flag({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div>
      {label}: <span className={ok ? "text-emerald-800" : "text-amber-800"}>{ok ? "ok" : "missing"}</span>
    </div>
  );
}

function maskedSender(from: string) {
  const at = from.indexOf("@");
  if (at < 1) return "[sender]";
  return `${from.slice(0, 1)}…@${from.slice(at + 1, 3)}…`;
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}
