import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { completeTaskAction } from "@/app/staff/actions";
import { catalogRepository } from "@/catalog/local-repository";
import { AssignForm, NoteForm, StageForm, TaskForm } from "@/components/staff/lead-forms";
import { listStaffDirectory, requireStaff } from "@/crm/guard";
import { isPipelineStage, STAGE_LABELS } from "@/crm/stages";
import { EmptyState } from "@/components/catalog/empty-state";
import { StaffShell } from "@/components/staff/staff-shell";

export const metadata = { title: "Lead" };

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-4 py-12 text-sm text-[var(--muted)]">Loading lead…</p>}>
      <LeadDetail params={params} />
    </Suspense>
  );
}

async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return (
      <StaffShell nextPath="/staff/leads">
        <EmptyState title="Lead not found" body="That address is not a lead id." />
      </StaffShell>
    );
  }
  const staff = await requireStaff(`/staff/leads/${id}`);
  if (!staff.admin) {
    return (
      <StaffShell nextPath={`/staff/leads/${id}`}>
        <EmptyState title="Lead locked" body="Set the service role key to open CRM records." />
      </StaffShell>
    );
  }

  const [{ data: lead, error }, directory] = await Promise.all([
    staff.admin
      .from("leads")
      .select(
        "id, name, email, status, source, vehicle_slug, assigned_to, inquiry_id, user_id, version, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    listStaffDirectory(staff.admin),
  ]);

  if (error) {
    return (
      <StaffShell nextPath={`/staff/leads/${id}`}>
        <p className="text-sm text-[var(--danger)]">{error.message}</p>
        <Link href={`/staff/leads/${id}`} className="text-sm underline">
          Retry
        </Link>
      </StaffShell>
    );
  }
  if (!lead) {
    return (
      <StaffShell nextPath="/staff/leads">
        <EmptyState title="Lead not found" body="No lead with this id is stored." />
        <Link href="/staff/leads" className="text-sm underline">
          Back to leads
        </Link>
      </StaffShell>
    );
  }

  const vehicle = lead.vehicle_slug ? await catalogRepository.getVehicleBySlug(lead.vehicle_slug) : null;
  const vehicleName = vehicle ? `${vehicle.brand.name} ${vehicle.model}` : lead.vehicle_slug;

  const [{ data: inquiry }, { data: activities }, { data: tasks }, { data: audit }] = await Promise.all([
    lead.inquiry_id
      ? staff.admin
          .from("inquiries")
          .select("id, name, email, message, vehicle_slug, configuration_snapshot, configuration_id, created_at")
          .eq("id", lead.inquiry_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    staff.admin.from("lead_activities").select("id, kind, body, created_at, actor_user_id").eq("lead_id", id).order("created_at", { ascending: false }).limit(50),
    staff.admin.from("lead_tasks").select("id, title, due_at, completed_at, assigned_to").eq("lead_id", id).order("created_at", { ascending: false }),
    staff.admin.from("lead_audit").select("id, action, created_at").eq("lead_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  const snapshot =
    inquiry?.configuration_snapshot && typeof inquiry.configuration_snapshot === "object"
      ? (inquiry.configuration_snapshot as Record<string, unknown>)
      : null;

  return (
    <StaffShell nextPath={`/staff/leads/${id}`}>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-[var(--muted)]">{lead.email}</p>
          <h2 className="font-display text-3xl">{lead.name ?? "Lead"}</h2>
          <p className="mt-1 text-sm">
            {isPipelineStage(lead.status) ? STAGE_LABELS[lead.status] : lead.status}
            {vehicleName ? ` · ${vehicleName}` : ""}
            {lead.created_at ? ` · ${formatWhen(lead.created_at)}` : ""}
          </p>
        </div>

        <section className="border border-[var(--line)] bg-[var(--card)] p-4">
          <h3 className="font-display text-xl">Inquiry</h3>
          {inquiry ? (
            <div className="mt-3 space-y-2 text-sm">
              <p>{inquiry.message}</p>
              <p className="text-[var(--muted)]">Submitted {formatWhen(inquiry.created_at)}</p>
              {inquiry.vehicle_slug ? (
                <p>
                  Vehicle:{" "}
                  <Link className="underline" href={`/cars/${inquiry.vehicle_slug}`}>
                    {vehicleName ?? inquiry.vehicle_slug}
                  </Link>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No inquiry row linked.</p>
          )}
        </section>

        <section className="border border-[var(--line)] bg-[var(--card)] p-4">
          <h3 className="font-display text-xl">Configuration</h3>
          {snapshot ? (
            <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              {(["paintId", "caliperId", "rimId", "preset", "theme"] as const).map((key) => (
                <div key={key}>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{key}</dt>
                  <dd>{String(snapshot[key] ?? "—")}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No public configuration snapshot.</p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="font-display text-xl">Activity</h3>
          {(activities ?? []).length === 0 ? (
            <EmptyState title="No activity yet" body="Stage changes, notes, and tasks appear here." />
          ) : (
            <ol className="space-y-2">
              {(activities ?? []).map((item) => (
                <li key={item.id} className="border border-[var(--line)] bg-[var(--card)] p-3 text-sm">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    {item.kind} · {formatWhen(item.created_at)}
                  </p>
                  <p className="mt-1">{item.body}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <StageForm leadId={lead.id} status={lead.status} version={lead.version} />
        <AssignForm leadId={lead.id} assignedTo={lead.assigned_to} version={lead.version} staff={directory} />
        <NoteForm leadId={lead.id} />
        <TaskForm leadId={lead.id} staff={directory} />
        <section className="space-y-2">
          <h3 className="font-display text-xl">Tasks</h3>
          {(tasks ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No follow-ups yet.</p>
          ) : (
            <ul className="space-y-2">
              {(tasks ?? []).map((task) => (
                <li key={task.id} className="border border-[var(--line)] bg-[var(--card)] p-3 text-sm">
                  <p>{task.title}</p>
                  <p className="text-[var(--muted)]">
                    {task.due_at ? `Due ${task.due_at}` : "No due date"}
                    {task.completed_at ? " · done" : ""}
                  </p>
                  {!task.completed_at ? (
                    <form action={completeTaskAction} className="mt-2">
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button type="submit" className="text-xs underline">
                        Mark complete
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        {(audit ?? []).length > 0 ? (
          <p className="text-xs text-[var(--muted)]">{audit!.length} audited staff changes on this lead.</p>
        ) : null}
      </aside>
    </div>
    </StaffShell>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}
