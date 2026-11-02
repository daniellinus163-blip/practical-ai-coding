import Link from "next/link";
import { Suspense } from "react";
import { listStaffDirectory, requireStaff } from "@/crm/guard";
import { isPipelineStage, PIPELINE_STAGES, STAGE_LABELS } from "@/crm/stages";
import { EmptyState } from "@/components/catalog/empty-state";
import { StaffShell } from "@/components/staff/staff-shell";

export const metadata = { title: "Leads" };

const PAGE_SIZE = 20;

export default function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-12 text-sm">Loading leads…</p>}>
      <LeadsBody searchParams={searchParams} />
    </Suspense>
  );
}

async function LeadsBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireStaff("/staff/leads");
  const params = await searchParams;
  const q = String(Array.isArray(params.q) ? params.q[0] : params.q ?? "")
    .trim()
    .replace(/[%_,()]/g, "")
    .slice(0, 80);
  const stageRaw = String(Array.isArray(params.stage) ? params.stage[0] : params.stage ?? "");
  const stage = isPipelineStage(stageRaw) ? stageRaw : "";
  const assigned = String(Array.isArray(params.assigned) ? params.assigned[0] : params.assigned ?? "");
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page ?? "1") || 1);

  if (!staff.admin) {
    return (
      <StaffShell nextPath="/staff/leads">
        <EmptyState title="Leads unavailable" body="The service role key is required to read CRM rows." />
      </StaffShell>
    );
  }

  const directory = await listStaffDirectory(staff.admin);
  let query = staff.admin
    .from("leads")
    .select("id, name, email, status, source, vehicle_slug, assigned_to, created_at, updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (stage) query = query.eq("status", stage);
  if (assigned === "me") query = query.eq("assigned_to", staff.userId);
  else if (assigned === "unassigned") query = query.is("assigned_to", null);
  else if (assigned) query = query.eq("assigned_to", assigned);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,vehicle_slug.ilike.%${q}%`);

  const { data, error, count } = await query;
  const rows = data ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <StaffShell nextPath="/staff/leads">
    <div className="space-y-6">
      <form className="grid gap-3 border border-[var(--line)] bg-[var(--card)] p-4 md:grid-cols-4" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, vehicle"
          className="border border-[var(--line)] bg-white px-3 py-2 text-sm"
        />
        <select name="stage" defaultValue={stage} className="border border-[var(--line)] bg-white px-3 py-2 text-sm">
          <option value="">All stages</option>
          {PIPELINE_STAGES.map((item) => (
            <option key={item} value={item}>
              {STAGE_LABELS[item]}
            </option>
          ))}
        </select>
        <select name="assigned" defaultValue={assigned} className="border border-[var(--line)] bg-white px-3 py-2 text-sm">
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
          {directory.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.display_name || member.email || member.user_id.slice(0, 8)}
            </option>
          ))}
        </select>
        <button type="submit" className="on-dark bg-[var(--ink)] px-4 py-2 text-sm">
          Filter
        </button>
      </form>

      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-[var(--danger)]">{error.message}</p>
          <Link href="/staff/leads" className="text-sm underline">
            Retry
          </Link>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No leads match"
          body="Inquiries create a lead when the service role key is set. Try clearing search filters."
        />
      ) : (
        <div className="overflow-x-auto border border-[var(--line)] bg-[var(--card)]">
          <table className="min-w-[640px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2">Stage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr key={lead.id} className="border-b border-[var(--line)]">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(lead.updated_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <Link className="underline" href={`/staff/leads/${lead.id}`}>
                      {lead.name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{lead.email}</td>
                  <td className="px-3 py-2">{lead.vehicle_slug ?? "—"}</td>
                  <td className="px-3 py-2">
                    {isPipelineStage(lead.status) ? STAGE_LABELS[lead.status] : lead.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex flex-wrap items-center gap-3 text-sm">
        <span>
          Page {page} of {pages} · {total} leads
        </span>
        {page > 1 ? (
          <Link
            className="underline"
            href={`/staff/leads?q=${encodeURIComponent(q)}&stage=${stage}&assigned=${assigned}&page=${page - 1}`}
          >
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link
            className="underline"
            href={`/staff/leads?q=${encodeURIComponent(q)}&stage=${stage}&assigned=${assigned}&page=${page + 1}`}
          >
            Next
          </Link>
        ) : null}
      </p>
    </div>
    </StaffShell>
  );
}
