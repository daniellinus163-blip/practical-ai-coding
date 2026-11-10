import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { listStaffDirectory, requireStaff } from "@/crm/guard";
import { LeadTaskList, type LeadTaskItem } from "@/components/staff/lead-task-list";
import { SchedulerStatusPanel } from "@/components/staff/scheduler-status-panel";

export const metadata = { title: "Follow-ups" };

type Filter = "upcoming" | "overdue" | "open";

export default function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-12 text-sm">Loading follow-ups…</p>}>
      <FollowUpsBody searchParams={searchParams} />
    </Suspense>
  );
}

async function FollowUpsBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const staff = await requireStaff("/staff/follow-ups");
  const params = await searchParams;
  const filterRaw = String(Array.isArray(params.filter) ? params.filter[0] : params.filter ?? "upcoming");
  const filter: Filter =
    filterRaw === "overdue" || filterRaw === "open" ? filterRaw : "upcoming";

  if (!staff.admin) {
    return <p className="text-sm">Service role required.</p>;
  }

  const nowIso = new Date().toISOString();
  const directory = await listStaffDirectory(staff.admin);
  const assigneeName = new Map(
    directory.map((m) => [m.user_id, m.display_name || m.email || "Staff"]),
  );

  let query = staff.admin
    .from("lead_tasks")
    .select(
      "id, lead_id, title, description, due_at, completed_at, assigned_to, leads ( name, email )",
    )
    .is("completed_at", null)
    .not("due_at", "is", null)
    .order("due_at", { ascending: true })
    .limit(80);

  if (filter === "upcoming") {
    query = query.gte("due_at", nowIso);
  } else if (filter === "overdue") {
    query = query.lt("due_at", nowIso);
  }

  const { data, error } = await query;
  const grouped = new Map<string, LeadTaskItem[]>();

  for (const row of data ?? []) {
    const lead = normalizeLeadJoin(row.leads);
    const item: LeadTaskItem = {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      due_at: row.due_at,
      completed_at: row.completed_at,
      assigned_to: row.assigned_to,
      assigneeLabel: row.assigned_to ? assigneeName.get(row.assigned_to) ?? null : null,
    };
    const list = grouped.get(row.lead_id) ?? [];
    list.push(item);
    grouped.set(row.lead_id, list);
  }

  return (
    <div className="space-y-6">
        <header>
          <h2 className="font-display text-2xl">Follow-ups & tasks</h2>
          <p className="text-sm text-[var(--muted)]">Open tasks across leads. Reminders are sent by the server worker.</p>
        </header>

        <SchedulerStatusPanel />

        <nav className="flex flex-wrap gap-3 text-sm">
          <FilterLink active={filter === "upcoming"} href="/staff/follow-ups?filter=upcoming">
            Upcoming
          </FilterLink>
          <FilterLink active={filter === "overdue"} href="/staff/follow-ups?filter=overdue">
            Overdue
          </FilterLink>
          <FilterLink active={filter === "open"} href="/staff/follow-ups?filter=open">
            All open
          </FilterLink>
        </nav>

        {error ? <p className="text-sm text-[var(--danger)]">{error.message}</p> : null}

        {grouped.size === 0 ? (
          <p className="text-sm text-[var(--muted)]">No tasks in this view.</p>
        ) : (
          <div className="space-y-6">
            {[...grouped.entries()].map(([leadId, tasks]) => {
              const leadRow = normalizeLeadJoin(data?.find((r) => r.lead_id === leadId)?.leads);
              return (
                <section key={leadId} className="border border-[var(--line)] bg-[var(--card)] p-4">
                  <h3 className="font-display text-lg">
                    <Link className="underline" href={`/staff/leads/${leadId}`}>
                      {leadRow?.name ?? leadRow?.email ?? "Lead"}
                    </Link>
                  </h3>
                  <LeadTaskList leadId={leadId} tasks={tasks} />
                </section>
              );
            })}
          </div>
        )}
    </div>
  );
}

function normalizeLeadJoin(value: unknown): { name: string | null; email: string } | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) return normalizeLeadJoin(value[0]);
  const row = value as Record<string, unknown>;
  return {
    name: typeof row.name === "string" ? row.name : null,
    email: typeof row.email === "string" ? row.email : "Lead",
  };
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={active ? "font-medium underline" : "text-[var(--muted)] underline"}>
      {children}
    </Link>
  );
}
