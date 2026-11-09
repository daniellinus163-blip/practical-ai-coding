import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireStaff } from "@/crm/guard";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/crm/stages";
import { EmptyState } from "@/components/catalog/empty-state";
import { StaffShell } from "@/components/staff/staff-shell";

export const metadata = { title: "Staff overview" };

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

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [stageCounts, total, openTasks, overdue, recentInquiries] = await Promise.all([
    Promise.all(
      PIPELINE_STAGES.map(async (stage) => {
        const { count } = await staff.admin!.from("leads").select("id", { count: "exact", head: true }).eq("status", stage);
        return { stage, count: count ?? 0 };
      }),
    ),
    staff.admin.from("leads").select("id", { count: "exact", head: true }),
    staff.admin.from("lead_tasks").select("id", { count: "exact", head: true }).is("completed_at", null),
    staff.admin.from("lead_tasks").select("id", { count: "exact", head: true }).is("completed_at", null).lte("due_at", today),
    staff.admin.from("inquiries").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
  ]);

  const cards = [
    { label: "Leads", value: total.count ?? 0, href: "/staff/leads" },
    { label: "Open tasks", value: openTasks.count ?? 0, href: "/staff/leads" },
    { label: "Overdue tasks", value: overdue.count ?? 0, href: "/staff/leads" },
    { label: "Inquiries (7 days)", value: recentInquiries.count ?? 0, href: "/staff/leads" },
  ];

  return (
    <StaffShell nextPath="/staff">
    <div className="space-y-8">
      <p className="text-sm text-[var(--muted)]">
        Figures are counted from the database for staff only. Nothing here is sample data.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="border border-[var(--line)] bg-[var(--card)] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{card.label}</p>
            <p className="font-display mt-2 text-4xl text-[var(--ink)]">{card.value}</p>
          </Link>
        ))}
      </div>
      <section>
        <h2 className="font-display text-2xl">Pipeline</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stageCounts.map((row) => (
            <Link
              key={row.stage}
              href={`/staff/leads?stage=${row.stage}`}
              className="flex items-center justify-between border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm"
            >
              <span>{STAGE_LABELS[row.stage]}</span>
              <span>{row.count}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
    </StaffShell>
  );
}
