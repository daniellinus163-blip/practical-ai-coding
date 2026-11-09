"use client";

import { useActionState } from "react";
import {
  addLeadNoteAction,
  assignLeadAction,
  createTaskAction,
  sendCustomerFollowUpAction,
  updateLeadStageAction,
} from "@/app/staff/actions";
import { PIPELINE_STAGES, STAGE_LABELS, type PipelineStage } from "@/crm/stages";

type StaffOption = { user_id: string; display_name: string | null; email: string | null };

function Feedback({ error, success }: { error: string | null; success: string | null }) {
  if (error) return <p className="text-sm text-[var(--danger)]">{error}</p>;
  if (success) return <p className="text-sm text-[var(--ink)]">{success}</p>;
  return null;
}

export function StageForm({
  leadId,
  status,
  version,
}: {
  leadId: string;
  status: string;
  version: number;
}) {
  const [state, action, pending] = useActionState(updateLeadStageAction, { error: null, success: null });
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="version" value={String(version)} />
      <label className="block text-sm">
        Stage
        <select
          name="status"
          defaultValue={status}
          className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2"
        >
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage as PipelineStage]}
            </option>
          ))}
        </select>
      </label>
      <Feedback error={state.error} success={state.success} />
      <button type="submit" disabled={pending} className="on-dark bg-[var(--ink)] px-3 py-2 text-sm disabled:opacity-60">
        {pending ? "Saving…" : "Update stage"}
      </button>
    </form>
  );
}

export function AssignForm({
  leadId,
  assignedTo,
  version,
  staff,
}: {
  leadId: string;
  assignedTo: string | null;
  version: number;
  staff: StaffOption[];
}) {
  const [state, action, pending] = useActionState(assignLeadAction, { error: null, success: null });
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="version" value={String(version)} />
      <label className="block text-sm">
        Assigned staff
        <select
          name="assignedTo"
          defaultValue={assignedTo ?? ""}
          className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2"
        >
          <option value="">Unassigned</option>
          {staff.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.display_name || member.email || member.user_id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      <Feedback error={state.error} success={state.success} />
      <button type="submit" disabled={pending} className="border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-60">
        {pending ? "Saving…" : "Save assignment"}
      </button>
    </form>
  );
}

export function NoteForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(addLeadNoteAction, { error: null, success: null });
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="block text-sm">
        Staff note
        <textarea name="body" required minLength={2} maxLength={2000} rows={4} className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2" />
      </label>
      <Feedback error={state.error} success={state.success} />
      <button type="submit" disabled={pending} className="border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-60">
        {pending ? "Saving…" : "Add note"}
      </button>
    </form>
  );
}

export function TaskForm({ leadId, staff }: { leadId: string; staff: StaffOption[] }) {
  const [state, action, pending] = useActionState(createTaskAction, { error: null, success: null });
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="block text-sm">
        Follow-up
        <input name="title" required minLength={2} maxLength={160} className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2" />
      </label>
      <label className="block text-sm">
        Due date
        <input name="dueAt" type="date" className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2" />
      </label>
      <label className="block text-sm">
        Responsible
        <select name="assignedTo" className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2">
          {staff.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.display_name || member.email || member.user_id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      <Feedback error={state.error} success={state.success} />
      <button type="submit" disabled={pending} className="border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-60">
        {pending ? "Saving…" : "Add task"}
      </button>
    </form>
  );
}

export function CustomerFollowUpForm({ leadId, customerEmail }: { leadId: string; customerEmail: string }) {
  const [state, action, pending] = useActionState(sendCustomerFollowUpAction, { error: null, success: null });
  return (
    <form action={action} className="space-y-3 border border-[var(--line)] bg-[var(--card)] p-4">
      <div>
        <h3 className="font-display text-lg">Reply to customer</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Sends to <span className="font-mono">{customerEmail}</span> and shows in their account when they signed in.
        </p>
      </div>
      <input type="hidden" name="leadId" value={leadId} />
      <label className="block text-sm">
        Your message
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2 text-sm"
          placeholder="Thank you for your inquiry. Here is what we can offer…"
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirm" value="yes" required className="mt-1" />
        I confirm this message goes to the customer by email and in-app notification.
      </label>
      <Feedback error={state.error} success={state.success} />
      <button type="submit" disabled={pending} className="on-dark bg-[var(--ink)] px-3 py-2 text-sm disabled:opacity-60">
        {pending ? "Sending…" : "Send follow-up"}
      </button>
    </form>
  );
}
