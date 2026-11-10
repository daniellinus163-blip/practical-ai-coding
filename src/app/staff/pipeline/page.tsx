import { Suspense } from "react";
import Link from "next/link";
import { requireStaff } from "@/crm/guard";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/crm/stages";
import { EmptyState } from "@/components/catalog/empty-state";
import { PipelineLeadCard } from "@/components/staff/pipeline-lead-card";
import { isLeadPriority } from "@/crm/lead-priority";

export const metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <Suspense fallback={<p className="px-4 py-12 text-sm">Loading pipeline…</p>}>
      <PipelineBody />
    </Suspense>
  );
}

async function PipelineBody() {
  const staff = await requireStaff("/staff/pipeline");
  if (!staff.admin) {
    return <EmptyState title="Pipeline unavailable" body="Set the service role key to load live stages." />;
  }

  const columns = await Promise.all(
    PIPELINE_STAGES.map(async (stage) => {
      const { data } = await staff.admin!
        .from("leads")
        .select("id, name, email, vehicle_slug, status, version, priority, updated_at")
        .eq("status", stage)
        .order("updated_at", { ascending: false })
        .limit(30);
      const leads = (data ?? []).map((lead) => ({
        ...lead,
        priority: isLeadPriority(lead.priority) ? lead.priority : "normal",
      }));
      return { stage, leads };
    }),
  );

  const total = columns.reduce((sum, col) => sum + col.leads.length, 0);

  return (
    <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Sales pipeline</h2>
            <p className="text-sm text-[var(--muted)]">
              Stages sync to the existing HubSpot deal on change (no duplicate deals). {total} leads shown (max 30 per column).
            </p>
          </div>
          <Link href="/staff/leads" className="text-sm underline">
            Table view
          </Link>
        </header>

        <div className="flex gap-3 overflow-x-auto pb-4 lg:grid lg:grid-cols-7 lg:overflow-visible">
          {columns.map((column) => (
            <section
              key={column.stage}
              className="flex w-64 shrink-0 flex-col border border-[var(--line)] bg-[var(--card)] lg:w-auto"
            >
              <h3 className="border-b border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.14em]">
                {STAGE_LABELS[column.stage]} · {column.leads.length}
              </h3>
              <ul className="max-h-[32rem] space-y-2 overflow-y-auto p-2">
                {column.leads.length === 0 ? (
                  <li className="px-1 py-2 text-xs text-[var(--muted)]">Empty</li>
                ) : (
                  column.leads.map((lead) => <PipelineLeadCard key={lead.id} lead={lead} />)
                )}
              </ul>
            </section>
          ))}
        </div>
    </div>
  );
}
