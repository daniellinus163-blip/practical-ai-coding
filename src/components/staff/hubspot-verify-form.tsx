"use client";

import { useActionState } from "react";
import { verifyHubspotAction } from "@/app/staff/events/actions";

export function HubspotVerifyForm() {
  const [state, action, pending] = useActionState(verifyHubspotAction, { error: null, success: null });

  return (
    <form action={action} className="space-y-2">
      <button
        type="submit"
        className="border border-[var(--line)] px-3 py-2 text-sm"
        disabled={pending}
      >
        {pending ? "Checking…" : "Verify HubSpot token (live read)"}
      </button>
      <p className="text-xs text-[var(--muted)]">One read-only API call. Not cached; use sparingly.</p>
      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm">{state.success}</p> : null}
    </form>
  );
}
