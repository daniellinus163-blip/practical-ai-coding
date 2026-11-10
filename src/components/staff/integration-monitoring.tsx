import type { IntegrationMonitoringSnapshot, MonitorChannel } from "@/crm/integration-monitoring";
import { EventsRetryControls } from "@/components/staff/events-retry-controls";
import { IntegrationHealthCards } from "@/components/staff/integration-health-cards";
import { StaffTableWrap } from "@/components/staff/staff-ui";

const STATE_LABEL: Record<MonitorChannel["state"], string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
  idle: "Idle",
  unconfigured: "Not configured",
};

const STATE_CLASS: Record<MonitorChannel["state"], string> = {
  healthy: "text-emerald-800",
  degraded: "text-amber-800",
  down: "text-red-700",
  idle: "text-[var(--muted)]",
  unconfigured: "text-[var(--muted)]",
};

export function IntegrationMonitoringOverview({ snapshot }: { snapshot: IntegrationMonitoringSnapshot }) {
  const { worker } = snapshot;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Pending events" value={worker.queued} warn={worker.queued > 0} />
      <Stat label="Processing" value={worker.processing} warn={worker.processing > 0} />
      <Stat label="Failed / dead" value={worker.failedOrDead} warn={worker.failedOrDead > 0} />
      <Stat label="Succeeded (all time)" value={worker.succeeded} warn={false} />
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn: boolean }) {
  return (
    <article className="staff-card">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className={`font-display mt-2 text-3xl tabular-nums ${warn ? "text-amber-800" : "text-[var(--ink)]"}`}>
        {value}
      </p>
    </article>
  );
}

export function IntegrationChannelGrid({ channels }: { channels: MonitorChannel[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {channels.map((channel) => (
        <article key={channel.key} className="border border-[var(--line)] bg-[var(--card)] p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-lg">{channel.title}</h3>
            <span className={`text-xs font-medium ${STATE_CLASS[channel.state]}`}>
              {STATE_LABEL[channel.state]}
            </span>
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Configured</dt>
              <dd>{channel.configured ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Pending (worker)</dt>
              <dd>{channel.pendingEvents}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Last success</dt>
              <dd>{formatWhen(channel.lastSuccessAt)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Last error</dt>
              <dd className="text-[var(--danger)]">{channel.lastError ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Recent sample</dt>
              <dd>
                {channel.succeededDeliveriesSample} succeeded · {channel.failedDeliveriesSample} failed (last delivery
                rows)
              </dd>
            </div>
          </dl>
          <ul className="mt-3 list-inside list-disc text-xs text-[var(--muted)]">
            {channel.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

export function IntegrationEventLog({
  failedEvents,
  recentEvents,
  admin,
}: {
  failedEvents: IntegrationMonitoringSnapshot["failedEvents"];
  recentEvents: IntegrationMonitoringSnapshot["recentEvents"];
  admin: boolean;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h3 className="font-display text-xl">Failed events</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">Errors are sanitized. Retry re-queues failed delivery rows.</p>
        <EventTable rows={failedEvents} admin={admin} empty="No failed or dead events." />
      </section>
      <section>
        <h3 className="font-display text-xl">Recent events</h3>
        <EventTable rows={recentEvents} admin={false} empty="No automation events yet." />
      </section>
    </div>
  );
}

function EventTable({
  rows,
  admin,
  empty,
}: {
  rows: IntegrationMonitoringSnapshot["failedEvents"];
  admin: boolean;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-[var(--muted)]">{empty}</p>;
  }
  return (
    <StaffTableWrap>
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
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-[var(--line)]">
              <td className="px-3 py-2 font-mono text-xs">{row.event_type}</td>
              <td className="px-3 py-2">{row.status}</td>
              <td className="px-3 py-2">
                {row.attempt_count}/{row.max_attempts}
              </td>
              <td className="max-w-xs px-3 py-2 text-[var(--muted)]">{row.last_error ?? "—"}</td>
              {admin ? (
                <td className="px-3 py-2">
                  {row.canRetry ? <EventsRetryControls eventId={row.id} compact /> : "—"}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </StaffTableWrap>
  );
}

export function IntegrationDeliveryLog({
  customerDeliveries,
  staffDeliveries,
  allDeliveries,
}: {
  customerDeliveries: IntegrationMonitoringSnapshot["customerDeliveries"];
  staffDeliveries: IntegrationMonitoringSnapshot["staffDeliveries"];
  allDeliveries: IntegrationMonitoringSnapshot["deliveries"];
}) {
  return (
    <div className="space-y-8">
      <p className="text-sm text-[var(--muted)]">
        Customer and staff email deliveries are separate integrations. The worker attempts each channel
        independently; one failure does not skip the other.
      </p>
      <DeliverySection title="Customer email log" rows={customerDeliveries} />
      <DeliverySection title="Staff notification log" rows={staffDeliveries} />
      <DeliverySection title="All recent deliveries" rows={allDeliveries.slice(0, 40)} />
    </div>
  );
}

function DeliverySection({
  title,
  rows,
}: {
  title: string;
  rows: IntegrationMonitoringSnapshot["deliveries"];
}) {
  return (
    <section>
      <h3 className="font-display text-xl">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">No rows yet.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {rows.map((row) => (
            <li key={`${row.event_id}-${row.integration}`} className="border border-[var(--line)] bg-[var(--card)] px-3 py-2">
              <p className="font-medium">{row.integrationLabel}</p>
              <p className="text-xs text-[var(--muted)]">
                Event {row.event_id.slice(0, 8)}… · {row.status} · attempts {row.attempt_count}
                {row.retryable === false ? " · not retryable" : ""}
              </p>
              {row.last_error ? <p className="mt-1 text-xs text-[var(--danger)]">{row.last_error}</p> : null}
              <p className="mt-1 text-[10px] text-[var(--muted)]">Updated {formatWhen(row.updated_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function IntegrationHealthSection({ snapshot }: { snapshot: IntegrationMonitoringSnapshot }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl">Integration summary cards</h2>
      <IntegrationHealthCards cards={snapshot.cards} />
    </section>
  );
}

function formatWhen(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}
