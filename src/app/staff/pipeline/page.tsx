import Link from "next/link";
import { requireStaff } from "@/crm/guard";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/crm/stages";
import { EmptyState } from "@/components/catalog/empty-state";
import { StaffShell } from "@/components/staff/staff-shell";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const staff = await requireStaff("/staff/pipeline");
  if (!staff.admin) {
    return (
      <StaffShell nextPath="/staff/pipeline">
        <EmptyState title="Pipeline unavailable" body="Set the service role key to load live stages." />
      </StaffShell>
    );
  }

  const columns = await Promise.all(
    PIPELINE_STAGES.map(async (stage) => {
      const { data } = await staff.admin!.from("leads")
        .select("id, name, email, vehicle_slug, updated_at")
        .eq("status", stage)
        .order("updated_at", { ascending: false })
        .limit(25);
      return { stage, leads: data ?? [] };
    }),
  );

  return (
    <StaffShell nextPath="/staff/pipeline">
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">Live stages. Each card opens the lead record.</p>
      <div className="flex gap-3 overflow-x-auto pb-4 lg:grid lg:grid-cols-7 lg:overflow-visible">
        {columns.map((column) => (
          <section
            key={column.stage}
            className="w-56 shrink-0 border border-[var(--line)] bg-[var(--card)] lg:w-auto"
          >
            <h2 className="border-b border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.14em]">
              {STAGE_LABELS[column.stage]} · {column.leads.length}
            </h2>
            <ul className="space-y-2 p-2">
              {column.leads.length === 0 ? (
                <li className="px-1 py-2 text-xs text-[var(--muted)]">Empty</li>
              ) : (
                column.leads.map((lead) => (
                  <li key={lead.id}>
                    <Link href={`/staff/leads/${lead.id}`} className="block border border-[var(--line)] p-2 text-xs">
                      <p className="font-medium">{lead.name ?? lead.email}</p>
                      <p className="text-[var(--muted)]">{lead.vehicle_slug ?? "No vehicle"}</p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
    </StaffShell>
  );
}
