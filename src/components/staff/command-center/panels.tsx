import Link from "next/link";
import type { ReactNode } from "react";
import type { CommandCenterDashboard } from "@/crm/command-center-dashboard";
import { HorizontalBarChart, VerticalBarChart } from "@/components/staff/command-center/bar-chart";

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ? `space-y-3 ${className}` : "space-y-3"}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl">{title}</h2>
        {action ? (
          <Link href={action.href} className="text-xs underline">
            {action.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyList({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-[var(--line)] bg-[var(--card)] px-4 py-8 text-center text-xs text-[var(--muted)]">
      {message}
    </div>
  );
}

export function CommandCenterCharts({
  dashboard,
  vehicleLabels,
}: {
  dashboard: CommandCenterDashboard;
  vehicleLabels: Map<string, string>;
}) {
  const inquiryBars = dashboard.inquiryActivity.map((row) => ({
    label: row.day,
    value: row.count,
  }));

  const pipelineBars = dashboard.pipelineStages.map((row) => ({
    label: row.label,
    value: row.count,
    hint: row.stage,
  }));

  const vehicleBars = dashboard.popularVehicles.map((row) => ({
    label: vehicleLabels.get(row.slug) ?? row.slug,
    value: row.count,
    hint: row.slug,
  }));

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <Section title="Inquiry activity (14 days, UTC)">
        <VerticalBarChart
          data={inquiryBars}
          emptyTitle="No inquiries in this window"
          emptyBody="Counts appear when customers submit inquiries."
        />
      </Section>
      <Section title="Lead pipeline" action={{ href: "/staff/pipeline", label: "Board" }}>
        <HorizontalBarChart
          data={pipelineBars}
          emptyTitle="No leads in CRM"
          emptyBody="Leads are created when inquiries are recorded."
        />
      </Section>
      <Section title="Popular vehicles (inquiries)" className="lg:col-span-2">
        <HorizontalBarChart
          data={vehicleBars}
          emptyTitle="No vehicle data"
          emptyBody="Inquiry records include a vehicle_slug when the customer configured a model."
        />
      </Section>
    </div>
  );
}

export function CommandCenterLists({ dashboard }: { dashboard: CommandCenterDashboard }) {
  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <Section title="Recent inquiries" action={{ href: "/staff/leads", label: "All leads" }}>
        {dashboard.recentInquiries.length === 0 ? (
          <EmptyList message="No inquiries recorded yet." />
        ) : (
          <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-[var(--card)]">
            {dashboard.recentInquiries.map((row) => (
              <li key={row.id} className="px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-[var(--muted)]">{row.email}</p>
                    {row.vehicleSlug ? (
                      <p className="text-xs text-[var(--muted)]">{row.vehicleSlug}</p>
                    ) : null}
                  </div>
                  {row.leadId ? (
                    <Link className="shrink-0 text-xs underline" href={`/staff/leads/${row.leadId}`}>
                      Open lead
                    </Link>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">No lead</span>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-[var(--muted)]">{formatWhen(row.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recent staff activity">
        {dashboard.recentStaffActivity.length === 0 ? (
          <EmptyList message="No staff actions logged yet." />
        ) : (
          <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-[var(--card)]">
            {dashboard.recentStaffActivity.map((row) => (
              <li key={row.id} className="px-3 py-2 text-sm">
                <p className="text-xs text-[var(--muted)]">
                  {row.actorLabel} · {row.kind.replaceAll("_", " ")}
                </p>
                <p className="mt-0.5 line-clamp-2">{row.bodyPreview}</p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[var(--muted)]">
                  <span>{formatWhen(row.createdAt)}</span>
                  <Link className="underline" href={`/staff/leads/${row.leadId}`}>
                    Lead
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Upcoming follow-ups" action={{ href: "/staff/follow-ups", label: "All tasks" }}>
        {dashboard.upcomingFollowUps.length === 0 ? (
          <EmptyList message="No open tasks with future due dates." />
        ) : (
          <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-[var(--card)]">
            {dashboard.upcomingFollowUps.map((row) => (
              <li key={row.id} className="px-3 py-2 text-sm">
                <Link className="font-medium underline" href={`/staff/leads/${row.leadId}`}>
                  {row.title}
                </Link>
                <p className="text-xs text-[var(--muted)]">
                  {row.leadName ?? row.leadEmail} · due {formatWhen(row.dueAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
