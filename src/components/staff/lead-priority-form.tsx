"use client";

import { useActionState } from "react";
import { updateLeadPriorityAction } from "@/app/staff/actions";
import { LEAD_PRIORITIES, PRIORITY_LABELS, type LeadPriority } from "@/crm/lead-priority";

export function LeadPriorityForm({ leadId, priority }: { leadId: string; priority: LeadPriority }) {
  const [state, action, pending] = useActionState(updateLeadPriorityAction, { error: null, success: null });

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="block text-sm">
        Priority
        <select
          name="priority"
          defaultValue={priority}
          className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2"
        >
          {LEAD_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </label>
      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--ink)]">{state.success}</p> : null}
      <button type="submit" disabled={pending} className="border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-60">
        {pending ? "Saving…" : "Save priority"}
      </button>
    </form>
  );
}
