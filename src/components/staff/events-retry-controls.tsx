"use client";

import { useActionState } from "react";
import { processEventsNowAction, retryEventAction } from "@/app/staff/events/actions";

export function EventsRetryControls({ eventId, compact = false }: { eventId?: string; compact?: boolean }) {
  const [retryState, retryAction, retrying] = useActionState(retryEventAction, { error: null, success: null });
  const [runState, runAction, running] = useActionState(processEventsNowAction, { error: null, success: null });

  if (compact && eventId) {
    return (
      <form action={retryAction}>
        <input type="hidden" name="eventId" value={eventId} />
        <button type="submit" className="text-xs underline" disabled={retrying}>
          {retrying ? "Retrying…" : "Retry"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-2">
      <form action={runAction}>
        <button type="submit" className="border border-[var(--line)] bg-[var(--ink)] px-3 py-2 text-sm text-[var(--hero-text)]" disabled={running}>
          {running ? "Running…" : "Process queued events now"}
        </button>
      </form>
      {runState.error ? <p className="text-sm text-[var(--danger)]">{runState.error}</p> : null}
      {runState.success ? <p className="text-sm">{runState.success}</p> : null}
      {retryState.error ? <p className="text-sm text-[var(--danger)]">{retryState.error}</p> : null}
      {retryState.success ? <p className="text-sm">{retryState.success}</p> : null}
    </div>
  );
}
