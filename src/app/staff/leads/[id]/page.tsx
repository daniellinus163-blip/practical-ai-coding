import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { catalogRepository } from "@/catalog/local-repository";
import { AssignForm, NoteForm, StageForm, TaskForm } from "@/components/staff/lead-forms";
import { LeadCommunicationCentre } from "@/components/staff/lead-communication-centre";
import {
  buildConversationMessages,
  buildInternalNotes,
  resendEmailAdvisory,
  resolveStaffActorNames,
} from "@/crm/lead-conversation";
import { listStaffDirectory, requireStaff } from "@/crm/guard";
import { EmptyState } from "@/components/catalog/empty-state";
import { buildConfigurationDetails } from "@/crm/configuration-summary";
import { hubspotStageSyncStatus, loadLeadIntegrationView } from "@/crm/lead-automation";
import { LeadConfigurationPanel } from "@/components/staff/lead-configuration-panel";
import { isLeadPriority, type LeadPriority } from "@/crm/lead-priority";
import { LeadIntegrationPanel } from "@/components/staff/lead-integration-panel";
import { LeadPriorityForm } from "@/components/staff/lead-priority-form";
import { LeadSummaryHeader } from "@/components/staff/lead-summary-header";
import { LeadTaskList, type LeadTaskItem } from "@/components/staff/lead-task-list";

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
    return <EmptyState title="Lead not found" body="That address is not a lead id." />;
  }
  const staff = await requireStaff(`/staff/leads/${id}`);
  if (!staff.admin) {
    return <EmptyState title="Lead locked" body="Set the service role key to open CRM records." />;
  }

  const [{ data: lead, error }, directory] = await Promise.all([
    staff.admin
      .from("leads")
      .select(
        "id, name, email, status, source, vehicle_slug, assigned_to, inquiry_id, user_id, version, priority, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    listStaffDirectory(staff.admin),
  ]);

  if (error) {
    return (
      <>
        <p className="text-sm text-[var(--danger)]">{error.message}</p>
        <Link href={`/staff/leads/${id}`} className="text-sm underline">
          Retry
        </Link>
      </>
    );
  }
  if (!lead) {
    return (
      <>
        <EmptyState title="Lead not found" body="No lead with this id is stored." />
        <Link href="/staff/leads" className="text-sm underline">
          Back to leads
        </Link>
      </>
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
    staff.admin
      .from("lead_activities")
      .select("id, kind, body, created_at, actor_user_id, meta")
      .eq("lead_id", id)
      .order("created_at", { ascending: true })
      .limit(80),
    staff.admin
      .from("lead_tasks")
      .select("id, title, description, due_at, completed_at, assigned_to")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    staff.admin.from("lead_audit").select("id, action, created_at").eq("lead_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  let savedConfigurationName: string | null = null;
  if (inquiry?.configuration_id) {
    const { data: savedRow } = await staff.admin
      .from("saved_configurations")
      .select("name")
      .eq("id", inquiry.configuration_id)
      .maybeSingle();
    savedConfigurationName = savedRow?.name ?? null;
  }

  const snapshot =
    inquiry?.configuration_snapshot && typeof inquiry.configuration_snapshot === "object"
      ? (inquiry.configuration_snapshot as Record<string, unknown>)
      : null;

  const actorIds = (activities ?? []).map((row) => row.actor_user_id).filter((v): v is string => Boolean(v));
  const actorNames = await resolveStaffActorNames(staff.admin, actorIds);
  const messages = buildConversationMessages(activities ?? [], actorNames, lead.name ?? "Customer");
  const internalNotes = buildInternalNotes(activities ?? [], actorNames);
  const emailAdvisory = resendEmailAdvisory();

  const integration = await loadLeadIntegrationView(staff.admin, {
    leadId: id,
    inquiryId: lead.inquiry_id,
    inquirySubmittedAt: inquiry?.created_at ?? null,
  });

  const priority: LeadPriority = isLeadPriority(lead.priority) ? lead.priority : "normal";
  const assignedMember = directory.find((m) => m.user_id === lead.assigned_to);
  const assignedLabel = assignedMember
    ? assignedMember.display_name || assignedMember.email || "Staff"
    : null;
  const nextOpenTask = (tasks ?? []).find((t) => !t.completed_at && t.due_at);
  const hubspotSync = hubspotStageSyncStatus(integration);
  const configurationRows = buildConfigurationDetails({
    snapshot: inquiry?.configuration_snapshot ?? null,
    vehicle,
    savedConfigurationName,
    savedConfigurationId: inquiry?.configuration_id ?? null,
    defaultTrimName: vehicle?.configurations.find((c) => c.isDefault)?.name ?? null,
  });

  const taskItems: LeadTaskItem[] = (tasks ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    due_at: task.due_at,
    completed_at: task.completed_at,
    assigned_to: task.assigned_to,
    assigneeLabel: task.assigned_to
      ? directory.find((m) => m.user_id === task.assigned_to)?.display_name ||
        directory.find((m) => m.user_id === task.assigned_to)?.email ||
        null
      : null,
  }));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
      <div className="space-y-6">
        <LeadSummaryHeader
          leadId={lead.id}
          name={lead.name}
          email={lead.email}
          source={lead.source}
          status={lead.status}
          priority={priority}
          vehicleName={vehicleName ?? null}
          vehicleSlug={lead.vehicle_slug}
          inquiryDate={inquiry?.created_at ?? lead.created_at}
          assignedLabel={assignedLabel}
          followUpDue={nextOpenTask?.due_at ?? null}
          hubspot={{
            contactId: integration.hubspotContactId,
            dealId: integration.hubspotDealId,
            stageSync: hubspotSync,
            dealSync: integration.hubspotDealSync,
            inquiryEventId: integration.hubspotInquiryEventId,
          }}
        />

        {inquiry ? (
          <LeadConfigurationPanel
            rows={configurationRows}
            vehicleHref={lead.vehicle_slug ? `/cars/${lead.vehicle_slug}` : null}
            previewNote="Use the public vehicle studio for a live 3D preview — rendered inquiry thumbnails are not stored yet."
          />
        ) : null}

        {inquiry ? (
          <LeadCommunicationCentre
            leadId={lead.id}
            customerName={lead.name ?? "Customer"}
            customerEmail={lead.email ?? ""}
            vehicle={{
              name: vehicleName ?? null,
              slug: lead.vehicle_slug,
              href: lead.vehicle_slug ? `/cars/${lead.vehicle_slug}` : null,
            }}
            inquiry={{
              message: inquiry.message,
              submittedAt: inquiry.created_at,
              configuration: snapshot,
            }}
            messages={messages}
            internalNotes={internalNotes}
            emailAdvisory={emailAdvisory}
          />
        ) : (
          <EmptyState title="No inquiry linked" body="This lead has no customer inquiry thread yet." />
        )}

        <LeadIntegrationPanel
          leadId={lead.id}
          inquiryId={lead.inquiry_id}
          inquiryCreatedAt={inquiry?.created_at ?? null}
          configurationId={inquiry?.configuration_id ?? null}
          integration={integration}
        />

        <section className="space-y-3">
          <h3 className="font-display text-xl">Automation activity timeline</h3>
          <p className="text-sm text-[var(--muted)]">Stage changes, tasks, and system events (customer thread is above).</p>
          <ol className="space-y-2">
            {(activities ?? [])
              .filter((item) => !["inquiry_received", "customer_follow_up", "customer_reply", "note"].includes(item.kind))
              .reverse()
              .map((item) => (
                <li key={item.id} className="border border-[var(--line)] bg-[var(--card)] p-3 text-sm">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    {item.kind} · {formatWhen(item.created_at)}
                  </p>
                  <p className="mt-1">{item.body}</p>
                </li>
              ))}
          </ol>
        </section>
      </div>

      <aside className="space-y-6">
        <LeadPriorityForm leadId={lead.id} priority={priority} />
        <StageForm leadId={lead.id} status={lead.status} version={lead.version} />
        <AssignForm leadId={lead.id} assignedTo={lead.assigned_to} version={lead.version} staff={directory} />
        <NoteForm leadId={lead.id} />
        <TaskForm leadId={lead.id} staff={directory} />
        <section className="space-y-2">
          <h3 className="font-display text-xl">Follow-up tasks</h3>
          <Link href="/staff/follow-ups" className="text-xs underline text-[var(--muted)]">
            All follow-ups
          </Link>
          <LeadTaskList leadId={lead.id} tasks={taskItems} />
        </section>
        {(audit ?? []).length > 0 ? (
          <p className="text-xs text-[var(--muted)]">{audit!.length} audited staff changes on this lead.</p>
        ) : null}
      </aside>
    </div>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}
