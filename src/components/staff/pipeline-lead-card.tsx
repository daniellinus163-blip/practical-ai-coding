"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateLeadStageAction } from "@/app/staff/actions";
import { formatLeadReference } from "@/crm/lead-automation";
import { PRIORITY_LABELS, type LeadPriority } from "@/crm/lead-priority";
import { PIPELINE_STAGES, STAGE_LABELS, type PipelineStage } from "@/crm/stages";

type LeadCard = {
  id: string;
  name: string | null;
  email: string;
  vehicle_slug: string | null;
  status: string;
  version: number;
  priority: LeadPriority;
  updated_at: string;
};

export function PipelineLeadCard({ lead }: { lead: LeadCard }) {
  const [state, action, pending] = useActionState(updateLeadStageAction, { error: null, success: null });
  const currentStage = PIPELINE_STAGES.includes(lead.status as PipelineStage)
    ? (lead.status as PipelineStage)
    : "new";

  return (
    <li className="border border-[var(--line)] bg-[var(--bg)] p-2 text-xs">
      <Link href={`/staff/leads/${lead.id}`} className="block font-medium underline-offset-2 hover:underline">
        {lead.name ?? lead.email}
      </Link>
      <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{formatLeadReference(lead.id)}</p>
      <p className="text-[var(--muted)]">{lead.vehicle_slug ?? "No vehicle"}</p>
      <p className="text-[10px] text-[var(--muted)]">
        {PRIORITY_LABELS[lead.priority] ?? lead.priority} · {new Date(lead.updated_at).toLocaleDateString()}
      </p>
      <form action={action} className="mt-2 space-y-1">
        <input type="hidden" name="leadId" value={lead.id} />
        <input type="hidden" name="version" value={String(lead.version)} />
        <select
          name="status"
          defaultValue={currentStage}
          className="w-full border border-[var(--line)] bg-white px-1 py-1"
          disabled={pending}
        >
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
        <button type="submit" disabled={pending} className="w-full underline disabled:opacity-50">
          {pending ? "Moving…" : "Move stage"}
        </button>
        {state.error ? <p className="text-[var(--danger)]">{state.error}</p> : null}
      </form>
    </li>
  );
}
