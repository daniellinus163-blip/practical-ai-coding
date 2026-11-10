import Link from "next/link";
import { Suspense } from "react";
import { catalogRepository } from "@/catalog/local-repository";
import { loadNextFollowUpDates } from "@/crm/lead-follow-ups";
import {
  LEAD_PAGE_SIZE,
  leadListQueryString,
  leadSearchOrClause,
  parseLeadListFilters,
} from "@/crm/lead-list";
import { formatLeadReference } from "@/crm/lead-automation";
import { PRIORITY_LABELS, isLeadPriority } from "@/crm/lead-priority";
import { listStaffDirectory, requireStaff } from "@/crm/guard";
import { isPipelineStage, PIPELINE_STAGES, STAGE_LABELS } from "@/crm/stages";
import { EmptyState } from "@/components/catalog/empty-state";

export const metadata = { title: "Leads" };

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
  const filters = parseLeadListFilters(params, staff.userId);

  if (!staff.admin) {
    return <EmptyState title="Leads unavailable" body="The service role key is required to read CRM rows." />;
  }

  const [directory, vehicles] = await Promise.all([listStaffDirectory(staff.admin), catalogRepository.listVehicles()]);
  const assigneeName = new Map(
    directory.map((m) => [m.user_id, m.display_name || m.email || m.user_id.slice(0, 8)]),
  );

  let query = staff.admin
    .from("leads")
    .select(
      "id, name, email, status, source, vehicle_slug, assigned_to, priority, created_at, updated_at",
      { count: "exact" },
    );

  if (filters.stage) query = query.eq("status", filters.stage);
  if (filters.assignedUserId === "unassigned") query = query.is("assigned_to", null);
  else if (filters.assignedUserId) query = query.eq("assigned_to", filters.assignedUserId);
  if (filters.vehicle) query = query.eq("vehicle_slug", filters.vehicle);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);

  const search = leadSearchOrClause(filters.q);
  if (search?.mode === "id") query = query.ilike("id", `${search.value}%`);
  else if (search?.mode === "text") query = query.or(`name.ilike.%${search.value}%,email.ilike.%${search.value}%,vehicle_slug.ilike.%${search.value}%`);

  if (filters.sort === "oldest") query = query.order("created_at", { ascending: true });
  else query = query.order("updated_at", { ascending: false });

  if (filters.sort !== "follow_up") {
    query = query.range((filters.page - 1) * LEAD_PAGE_SIZE, filters.page * LEAD_PAGE_SIZE - 1);
  }

  const { data, error, count } = await query;
  let rows = data ?? [];

  const followUps = await loadNextFollowUpDates(
    staff.admin,
    rows.map((r) => r.id),
  );

  if (filters.sort === "follow_up") {
    rows = [...rows].sort((a, b) => {
      const da = followUps.get(a.id) ?? "9999-12-31";
      const db = followUps.get(b.id) ?? "9999-12-31";
      return da.localeCompare(db);
    });
    const start = (filters.page - 1) * LEAD_PAGE_SIZE;
    rows = rows.slice(start, start + LEAD_PAGE_SIZE);
  }

  const total = count ?? rows.length;
  const pages = Math.max(1, Math.ceil(total / LEAD_PAGE_SIZE));
  const qs = leadListQueryString(filters);

  return (
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Lead management</h2>
            <p className="text-sm text-[var(--muted)]">Search, filter, and open full lead records.</p>
          </div>
          <Link href="/staff/pipeline" className="text-sm underline">
            Kanban pipeline
          </Link>
        </header>

        <form className="grid gap-3 border border-[var(--line)] bg-[var(--card)] p-4 md:grid-cols-3 lg:grid-cols-4" method="get">
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Name, email, vehicle, FSA-… or id"
            className="border border-[var(--line)] bg-white px-3 py-2 text-sm md:col-span-2"
          />
          <select name="stage" defaultValue={filters.stage} className="border border-[var(--line)] bg-white px-3 py-2 text-sm">
            <option value="">All stages</option>
            {PIPELINE_STAGES.map((item) => (
              <option key={item} value={item}>
                {STAGE_LABELS[item]}
              </option>
            ))}
          </select>
          <select name="assigned" defaultValue={filters.assignedParam} className="border border-[var(--line)] bg-white px-3 py-2 text-sm">
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
            {directory.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.display_name || member.email || member.user_id.slice(0, 8)}
              </option>
            ))}
          </select>
          <select name="vehicle" defaultValue={filters.vehicle} className="border border-[var(--line)] bg-white px-3 py-2 text-sm">
            <option value="">All vehicles</option>
            {vehicles.map((v) => (
              <option key={v.slug} value={v.slug}>
                {v.brand.name} {v.model}
              </option>
            ))}
          </select>
          <label className="text-xs">
            From
            <input name="from" type="date" defaultValue={filters.from} className="mt-1 w-full border border-[var(--line)] bg-white px-2 py-2 text-sm" />
          </label>
          <label className="text-xs">
            To
            <input name="to" type="date" defaultValue={filters.to} className="mt-1 w-full border border-[var(--line)] bg-white px-2 py-2 text-sm" />
          </label>
          <select name="sort" defaultValue={filters.sort} className="border border-[var(--line)] bg-white px-3 py-2 text-sm">
            <option value="newest">Newest activity</option>
            <option value="oldest">Oldest inquiry</option>
            <option value="follow_up">Follow-up date</option>
          </select>
          <button type="submit" className="on-dark bg-[var(--ink)] px-4 py-2 text-sm">
            Apply filters
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
          <EmptyState title="No leads match" body="Inquiries create leads automatically. Try clearing filters." />
        ) : (
          <div className="overflow-x-auto border border-[var(--line)] bg-[var(--card)]">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  <th className="px-3 py-2">Lead ID</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Assigned</th>
                  <th className="px-3 py-2">Inquiry</th>
                  <th className="px-3 py-2">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => (
                  <tr key={lead.id} className="border-b border-[var(--line)]">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link className="underline" href={`/staff/leads/${lead.id}`}>
                        {formatLeadReference(lead.id)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link className="underline font-medium" href={`/staff/leads/${lead.id}`}>
                        {lead.name ?? "—"}
                      </Link>
                      <p className="text-xs text-[var(--muted)]">{lead.email}</p>
                    </td>
                    <td className="px-3 py-2">{lead.vehicle_slug ?? "—"}</td>
                    <td className="px-3 py-2">
                      {isPipelineStage(lead.status) ? STAGE_LABELS[lead.status] : lead.status}
                    </td>
                    <td className="px-3 py-2">
                      {isLeadPriority(lead.priority) ? PRIORITY_LABELS[lead.priority] : lead.priority}
                    </td>
                    <td className="px-3 py-2">{lead.assigned_to ? assigneeName.get(lead.assigned_to) ?? "—" : "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(lead.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{followUps.get(lead.id) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            Page {filters.page} of {pages} · {total} leads
          </span>
          {filters.page > 1 ? (
            <Link className="underline" href={`/staff/leads${leadListQueryString(filters, filters.page - 1)}`}>
              Previous
            </Link>
          ) : null}
          {filters.page < pages ? (
            <Link className="underline" href={`/staff/leads${leadListQueryString(filters, filters.page + 1)}`}>
              Next
            </Link>
          ) : null}
        </p>
      </div>
  );
}
