"use client";

import { useActionState } from "react";
import { updatePasswordFromAccountAction } from "@/app/auth/actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordFromAccountAction, {
    error: null,
    success: null,
  });

  return (
    <form action={action} className="space-y-4 border border-[var(--line)] bg-[var(--card)] p-6">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">Security</p>
      <h2 className="font-display text-2xl">Password</h2>
      <p className="max-w-xl text-sm text-[var(--muted)]">
        Confirm your current password, then choose a new one of at least 8 characters.
      </p>
      <label className="block text-sm">
        Current password
        <input
          name="currentPassword"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2.5"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          New password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          Confirm new password
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2.5"
          />
        </label>
      </div>
      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--ink)]">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="border border-[var(--line)] px-5 py-2.5 text-sm disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
