import Link from "next/link";
import type { CommandCenterStats } from "@/crm/command-center-stats";
import type { CommandCenterDashboard } from "@/crm/command-center-dashboard";

export function CommandCenterStatusBanner({
  stats,
  kpis,
}: {
  stats: CommandCenterStats;
  kpis: CommandCenterDashboard["kpis"];
}) {
  const queued = stats.queuedEvents + stats.processingEvents;
  const failed = kpis.failedIntegrations;
  const overdue = kpis.overdueFollowUps;

  return (
    <section className="staff-status-banner space-y-4" aria-live="polite">
      {failed > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">Integration failures detected</p>
          <p className="mt-1 leading-relaxed">
            {failed} automation {failed === 1 ? "event has" : "events have"} failed or are dead. Open{" "}
            <Link className="underline" href="/staff/events">
              Monitoring
            </Link>{" "}
            to retry eligible jobs. This is not the same as events waiting in the queue.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--ink)]">
          <p className="font-medium">Automations healthy</p>
          <p className="mt-1 leading-relaxed text-[var(--muted)]">
            No failed or dead integration events in the database. Customer and staff email attempts are tracked
            separately per delivery row.
          </p>
        </div>
      )}

      {(overdue > 0 || stats.followUpsDue > 0 || queued > 0) && (
        <ul className="space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
          {overdue > 0 ? (
            <li className="leading-relaxed">
              <strong>{overdue}</strong> CRM{" "}
              {overdue === 1 ? "task is" : "tasks are"} past due.{" "}
              <Link className="underline" href="/staff/follow-ups?filter=overdue">
                Review follow-ups
              </Link>
            </li>
          ) : null}
          {stats.followUpsDue > 0 ? (
            <li className="leading-relaxed">
              <strong>{stats.followUpsDue}</strong> automation follow-up{" "}
              {stats.followUpsDue === 1 ? "reminder is" : "reminders are"} due for processing.
            </li>
          ) : null}
          {queued > 0 ? (
            <li className="leading-relaxed">
              <strong>{queued}</strong> in the worker queue ({stats.queuedEvents} queued, {stats.processingEvents}{" "}
              processing). That is a backlog, not a failure.{" "}
              <Link className="underline" href="/staff/events">
                Run or inspect the worker
              </Link>
            </li>
          ) : null}
        </ul>
      )}

      {failed === 0 && overdue === 0 && stats.followUpsDue === 0 && queued === 0 ? (
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          No overdue tasks or queued worker events right now.
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-[var(--muted)]">
        {stats.lastSucceededEventAt
          ? `Last succeeded automation event: ${formatWhen(stats.lastSucceededEventAt)}`
          : "No succeeded automation events recorded yet."}
      </p>
    </section>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}
