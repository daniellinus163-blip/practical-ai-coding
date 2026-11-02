import { Suspense } from "react";
import { connection } from "next/server";
import { requireStaff } from "@/crm/guard";
import { canRetryEvents } from "@/events/auth";
import { integrationHealth, loadIntegrationConfig } from "@/events/config";
import { EmptyState } from "@/components/catalog/empty-state";
import { StaffShell } from "@/components/staff/staff-shell";
import { EventsRetryControls } from "@/components/staff/events-retry-controls";

export const metadata = { title: "Integrations" };

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
      <StaffShell nextPath="/staff/events">
        <EmptyState title="Integrations locked" body="Set the service role key to inspect event deliveries." />
      </StaffShell>
    );
  }

  const health = integrationHealth(loadIntegrationConfig());
  const now = new Date().toISOString();
  const countStatus = (status: string | string[]) => {
    const query = db.from("automation_events").select("id", { count: "exact", head: true });
    return Array.isArray(status) ? query.in("status", status) : query.eq("status", status);
  };
  const [
    { data: failed },
    { data: recent },
    { data: recentEvents },
    { data: lastSuccess },
    queued,
    processing,
    succeeded,
    failedCount,
    followUpsDue,
    followUpsWaiting,
  ] = await Promise.all([
    db
      .from("automation_events")
      .select("id, event_type, status, attempt_count, last_error, created_at, completed_at")
      .in("status", ["failed", "dead"])
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("automation_event_deliveries")
      .select("event_id, integration, status, attempt_count, last_error, completed_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(40),
    db
      .from("automation_events")
      .select("id, event_type, status, attempt_count, next_attempt_at, last_error")
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("automation_events")
      .select("completed_at")
      .eq("status", "succeeded")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    countStatus("queued"),
    countStatus("processing"),
    countStatus("succeeded"),
    countStatus(["failed", "dead"]),
    db
      .from("automation_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "follow_up.reminder")
      .in("status", ["queued", "failed"])
      .lte("next_attempt_at", now),
    db
      .from("automation_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "follow_up.reminder")
      .in("status", ["queued", "failed"])
      .gt("next_attempt_at", now),
  ]);

  const admin = canRetryEvents(staff.role);

  return (
    <StaffShell nextPath="/staff/events">
      <div className="space-y-8">
        <section>
          <h2 className="font-display text-2xl">Integration health</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Flags show whether credentials exist on the server. They do not prove a live provider call succeeded.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Health label="HubSpot token" ok={health.hubspot} />
            <Health label="HubSpot stage maps" ok={health.hubspotStagesConfigured > 0} note={`${health.hubspotStagesConfigured} statuses`} />
            <Health
              label="Resend sender"
              ok={health.resend}
              note={
                health.resendTestSender
                  ? "Test sender. Resend delivers onboarding@resend.dev only to the account inbox until a domain is verified."
                  : undefined
              }
            />
            <Health label="Staff inbox" ok={health.resendInternalConfigured} />
            <Health label="Worker secret" ok={health.workerAuthConfigured} />
            <Health label="Resend dry run" ok={!health.dryRun} note={health.dryRun ? "on — no live email" : "off"} />
          </dl>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Health label="Queued" ok={(queued.count ?? 0) === 0} note={String(queued.count ?? 0)} />
            <Health label="Processing" ok={(processing.count ?? 0) === 0} note={String(processing.count ?? 0)} />
            <Health label="Completed" ok note={String(succeeded.count ?? 0)} />
            <Health label="Failed" ok={(failedCount.count ?? 0) === 0} note={String(failedCount.count ?? 0)} />
            <Health label="Follow-ups due" ok={(followUpsDue.count ?? 0) === 0} note={String(followUpsDue.count ?? 0)} />
            <Health label="Follow-ups waiting" ok note={String(followUpsWaiting.count ?? 0)} />
          </dl>
          <p className="mt-3 text-sm">
            Last successful event: {lastSuccess?.completed_at ? new Date(lastSuccess.completed_at).toUTCString() : "none yet"}
          </p>
        </section>

        {admin ? <EventsRetryControls /> : <p className="text-sm text-[var(--muted)]">Only administrators can retry or run the worker.</p>}

        <section>
          <h2 className="font-display text-2xl">Failed events</h2>
          {failed && failed.length > 0 ? (
            <div className="mt-3 overflow-x-auto border border-[var(--line)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--bg-2)] text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Attempts</th>
                    <th className="px-3 py-2">Error</th>
                    {admin ? <th className="px-3 py-2">Retry</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {failed.map((row) => (
                    <tr key={row.id} className="border-t border-[var(--line)]">
                      <td className="px-3 py-2">{row.event_type}</td>
                      <td className="px-3 py-2">{row.status}</td>
                      <td className="px-3 py-2">{row.attempt_count}</td>
                      <td className="max-w-xs truncate px-3 py-2 text-[var(--muted)]">{row.last_error ?? "—"}</td>
                      {admin ? (
                        <td className="px-3 py-2">
                          <EventsRetryControls eventId={row.id} compact />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No failed events.</p>
          )}
        </section>

        <section>
          <h2 className="font-display text-2xl">Recent events</h2>
          {recentEvents && recentEvents.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {recentEvents.map((row) => (
                <li key={row.id} className="border border-[var(--line)] bg-[var(--card)] px-3 py-2">
                  {row.event_type} · {row.status} · attempts {row.attempt_count}
                  {row.next_attempt_at ? ` · next ${row.next_attempt_at}` : ""}
                  {row.last_error ? ` · ${row.last_error}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No events recorded yet.</p>
          )}
        </section>

        <section>
          <h2 className="font-display text-2xl">Recent deliveries</h2>
          {recent && recent.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {recent.map((row) => (
                <li key={`${row.event_id}-${row.integration}`} className="border border-[var(--line)] bg-[var(--card)] px-3 py-2">
                  {deliveryLabel(row.integration)} · {row.status} · attempts {row.attempt_count}
                  {row.last_error ? ` · ${row.last_error}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No deliveries recorded yet.</p>
          )}
        </section>
      </div>
    </StaffShell>
  );
}

function deliveryLabel(integration: string) {
  if (integration === "resend") return "customer email";
  if (integration === "resend_staff") return "staff email";
  return integration;
}

function Health({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <div className="border border-[var(--line)] bg-[var(--card)] px-3 py-3">
      <dt className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-sm">{note ?? (ok ? "Configured" : "Not configured")}</dd>
    </div>
  );
}
