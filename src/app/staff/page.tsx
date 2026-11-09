import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { loadCommandCenterStats } from "@/crm/command-center-stats";
import { loadIntegrationSnapshot } from "@/crm/integration-snapshot";
import { requireStaff } from "@/crm/guard";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/crm/stages";
import { EmptyState } from "@/components/catalog/empty-state";
import { IntegrationHealthCards } from "@/components/staff/integration-health-cards";
import { StaffShell } from "@/components/staff/staff-shell";
import { loadIntegrationConfig } from "@/events/config";

export const metadata = { title: "Command Center" };

export default function StaffOverviewPage() {
  return (
    <Suspense fallback={<p className="px-4 py-12 text-sm">Checking staff access…</p>}>
      <StaffOverview />
    </Suspense>
  );
}

async function StaffOverview() {
  await connection();
  const staff = await requireStaff("/staff");
  if (!staff.admin) {
    return (
      <StaffShell nextPath="/staff">
        <EmptyState title="No live metrics yet" body="Counts appear after the service role key is set." />
      </StaffShell>
    );
  }

  const [stats, integrationCards] = await Promise.all([
    loadCommandCenterStats(staff.admin),
    loadIntegrationSnapshot(staff.admin, loadIntegrationConfig(), { serviceRolePresent: staff.serviceRole }),
  ]);

  const alertCount =
    stats.failedEvents + stats.queuedEvents + stats.processingEvents + stats.overdueTasks + stats.followUpsDue;

  const executiveCards = [
    { label: "Active leads", value: stats.totalLeads, href: "/staff/leads" },
    { label: "Inquiries (7d)", value: stats.inquiriesLast7Days, href: "/staff/leads" },
    { label: "Overdue tasks", value: stats.overdueTasks, href: "/staff/leads" },
    { label: "Failed events", value: stats.failedEvents, href: "/staff/events" },
    { label: "Queue / processing", value: stats.queuedEvents + stats.processingEvents, href: "/staff/events" },
    { label: "Follow-ups due", value: stats.followUpsDue, href: "/staff/events" },
  ];

  return (
    <StaffShell nextPath="/staff">
      <div className="space-y-8">
        <div>
          <p className="text-sm text-[var(--muted)]">
            FormShift AI Command Center — counts and integration states come from Supabase only.
          </p>
          {alertCount > 0 ? (
            <p className="mt-2 text-sm text-amber-800">
              Attention: {stats.failedEvents} failed automation events, {stats.followUpsDue} follow-ups due,{" "}
              {stats.overdueTasks} overdue CRM tasks.
            </p>
          ) : (
            <p className="mt-2 text-sm">No failed events, due follow-ups, or overdue tasks in the current snapshot.</p>
          )}
          {stats.lastSucceededEventAt ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Last succeeded automation event: {formatWhen(stats.lastSucceededEventAt)}
            </p>
          ) : null}
        </div>

        <section>
          <h2 className="font-display text-2xl">Executive overview</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {executiveCards.map((card) => (
              <Link key={card.label} href={card.href} className="border border-[var(--line)] bg-[var(--card)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{card.label}</p>
                <p className="font-display mt-2 text-4xl text-[var(--ink)]">{card.value}</p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl">Integrations</h2>
            <Link href="/staff/events" className="text-sm underline">
              Full integration center
            </Link>
          </div>
          <div className="mt-3">
            <IntegrationHealthCards cards={integrationCards} />
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl">Sales pipeline</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE_STAGES.map((stage) => (
              <Link
                key={stage}
                href={`/staff/leads?stage=${stage}`}
                className="flex items-center justify-between border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm"
              >
                <span>{STAGE_LABELS[stage]}</span>
                <span>{stats.stageCounts[stage] ?? 0}</span>
              </Link>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Stage columns use HubSpot-mapped ids from environment when events sync.
          </p>
          <Link href="/staff/pipeline" className="mt-2 inline-block text-sm underline">
            Open pipeline board
          </Link>
        </section>
      </div>
    </StaffShell>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}
