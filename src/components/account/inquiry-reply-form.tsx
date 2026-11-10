"use client";

import { useActionState } from "react";
import { submitCustomerInquiryReplyAction } from "@/app/account/inquiries/actions";

type State = { error: string | null; success: string | null };

export function InquiryReplyForm({ inquiryId }: { inquiryId: string }) {
  const [state, action, pending] = useActionState(submitCustomerInquiryReplyAction, {
    error: null,
    success: null,
  });

  return (
    <form action={action} className="mt-3 space-y-2 rounded-md border border-[var(--line)] bg-[var(--bg-2)]/50 p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">Your reply</p>
      <p className="text-xs text-[var(--muted)]">
        Replies here go to the staff conversation on your lead. Email replies to our messages are not synced yet.
      </p>
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <textarea
        name="message"
        required
        minLength={10}
        maxLength={4000}
        rows={4}
        disabled={pending}
        className="w-full border border-[var(--line)] bg-white px-3 py-2 text-sm disabled:opacity-60"
        placeholder="Add a question or update for the team…"
      />
      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--ink)]">{state.success}</p> : null}
      <button type="submit" disabled={pending} className="text-sm underline disabled:opacity-60">
        {pending ? "Sending…" : "Send reply to team"}
      </button>
    </form>
  );
}
