"use client";

import { useActionState } from "react";
import { retryLeadHubSpotSyncAction } from "@/app/staff/actions";

export function HubSpotSyncRetryForm({ leadId, eventId }: { leadId: string; eventId: string }) {
  const [state, action, pending] = useActionState(retryLeadHubSpotSyncAction, {
    error: null,
    success: null,
  });

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="eventId" value={eventId} />
      <button type="submit" disabled={pending} className="underline disabled:opacity-50">
        {pending ? "Retrying…" : "Retry HubSpot sync"}
      </button>
      {state.error ? <span className="text-[var(--danger)]">{state.error}</span> : null}
      {state.success ? <span className="text-[var(--ink)]">{state.success}</span> : null}
    </form>
  );
}
