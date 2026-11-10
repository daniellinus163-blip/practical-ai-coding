import Link from "next/link";
import type { CommandCenterDashboard } from "@/crm/command-center-dashboard";

type KpiCard = {
  label: string;
  value: string;
  hint: string;
  href?: string;
  accent?: "default" | "warn";
};

export function CommandCenterKpiGrid({ kpis }: { kpis: CommandCenterDashboard["kpis"] }) {
  const cards: KpiCard[] = [
    {
      label: "Total inquiries",
      value: String(kpis.totalInquiries),
      hint: "All rows in inquiries table",
      href: "/staff/leads",
    },
    {
      label: "New today",
      value: String(kpis.inquiriesToday),
      hint: "Inquiries created since 00:00 UTC",
      href: "/staff/leads",
    },
    {
      label: "Awaiting response",
      value: String(kpis.leadsAwaitingResponse),
      hint: "Leads still in New stage",
      href: "/staff/leads?stage=new",
    },
    {
      label: "Qualified",
      value: String(kpis.qualifiedLeads),
      hint: "Pipeline stage: Qualified",
      href: "/staff/leads?stage=qualified",
    },
    {
      label: "Won deals",
      value: String(kpis.wonDeals),
      hint: "Pipeline stage: Won",
      href: "/staff/leads?stage=won",
    },
    {
      label: "Overdue follow-ups",
      value: String(kpis.overdueFollowUps),
      hint: "Open tasks past due",
      href: "/staff/follow-ups?filter=overdue",
      accent: kpis.overdueFollowUps > 0 ? "warn" : "default",
    },
    {
      label: "Failed integrations",
      value: String(kpis.failedIntegrations),
      hint: "Automation events failed or dead",
      href: "/staff/events",
      accent: kpis.failedIntegrations > 0 ? "warn" : "default",
    },
    {
      label: "Median first reply",
      value: kpis.avgFirstResponseLabel ?? "—",
      hint:
        kpis.avgFirstResponseSampleSize > 0
          ? `Based on ${kpis.avgFirstResponseSampleSize} staff customer replies (median vs lead created)`
          : "No staff customer replies recorded yet",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const inner = (
          <div className="flex min-h-[7.5rem] flex-col gap-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{card.label}</p>
            <p
              className={`font-display text-3xl tabular-nums leading-none ${
                card.accent === "warn" ? "text-amber-800" : "text-[var(--ink)]"
              }`}
            >
              {card.value}
            </p>
            <p className="mt-auto text-xs leading-relaxed text-[var(--muted)]">{card.hint}</p>
          </div>
        );
        if (card.href) {
          return (
            <Link
              key={card.label}
              href={card.href}
              className="staff-card block transition hover:border-[var(--ink)]/30"
            >
              {inner}
            </Link>
          );
        }
        return (
          <article key={card.label} className="staff-card">
            {inner}
          </article>
        );
      })}
    </div>
  );
}
