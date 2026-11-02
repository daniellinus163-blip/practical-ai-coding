"use client";

import { useActionState } from "react";
import { submitInquiryAction, type InquiryState } from "@/app/inquiries/actions";
import { liveConfigKey, type PublicVehicleConfig } from "@/configurator/saved-config";

export function InquiryForm({
  vehicleSlug,
  configuration,
  configurationId,
}: {
  vehicleSlug?: string;
  configuration?: PublicVehicleConfig | null;
  configurationId?: string | null;
}) {
  const [state, action, pending] = useActionState(submitInquiryAction, {
    error: null,
    success: null,
  } satisfies InquiryState);
  function wrappedAction(formData: FormData) {
    if (pending) return;
    if (vehicleSlug && !formData.get("configuration")) {
      const live = sessionStorage.getItem(liveConfigKey(vehicleSlug));
      if (live) formData.set("configuration", live);
    }
    return action(formData);
  }

  return (
    <form action={wrappedAction} className="space-y-4 border border-[var(--line)] bg-[var(--card)] p-5">
      <h2 className="font-display text-2xl">Request a quote</h2>
      <p className="text-sm text-[var(--muted)]">
        Name, email, and your question only. An inquiry is not an order, allocation, or manufacturer
        reservation. The current studio selection is attached when present.
      </p>
      {vehicleSlug ? <input type="hidden" name="vehicleSlug" value={vehicleSlug} /> : null}
      {configurationId ? <input type="hidden" name="configurationId" value={configurationId} /> : null}
      {configuration ? (
        <input type="hidden" name="configuration" value={JSON.stringify(configuration)} />
      ) : null}
      <label className="block text-sm">
        Name
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Message
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--ink)]">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="on-dark bg-[var(--ink)] px-4 py-2 text-sm disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
