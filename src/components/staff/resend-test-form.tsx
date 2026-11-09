"use client";

import { useActionState } from "react";
import { sendResendTestAction } from "@/app/staff/events/actions";

export function ResendTestForm({ allowedRecipient }: { allowedRecipient: string | null }) {
  const [state, action, pending] = useActionState(sendResendTestAction, { error: null, success: null });

  if (!allowedRecipient) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Set RESEND_TEST_RECIPIENT to an approved inbox (must match exactly) to enable the staff test send.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3 border border-[var(--line)] bg-[var(--card)] p-4">
      <h3 className="font-display text-lg">Resend test (staff only)</h3>
      <p className="text-xs text-[var(--muted)]">
        Sends one message to <span className="font-mono">{allowedRecipient}</span> only. Blocked when{" "}
        INTEGRATIONS_DRY_RUN is not false. Does not prove production customer delivery.
      </p>
      <input type="hidden" name="recipient" value={allowedRecipient} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" value="yes" required />
        I confirm a test email to the approved recipient
      </label>
      <button
        type="submit"
        className="border border-[var(--line)] bg-[var(--ink)] px-3 py-2 text-sm text-[var(--hero-text)]"
        disabled={pending}
      >
        {pending ? "Sending…" : "Send test email"}
      </button>
      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm">{state.success}</p> : null}
    </form>
  );
}
