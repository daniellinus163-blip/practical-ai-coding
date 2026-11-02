"use client";

import { useActionState } from "react";
import {
  saveConfigurationAction,
  updateConfigurationAction,
  type SaveBuildState,
} from "@/app/account/build-actions";
import type { PublicVehicleConfig } from "@/configurator/saved-config";

export function SaveBuildButton({
  vehicleSlug,
  payload,
  savedBuildId,
}: {
  vehicleSlug: string;
  payload: PublicVehicleConfig;
  savedBuildId?: string | null;
}) {
  const action = savedBuildId ? updateConfigurationAction : saveConfigurationAction;
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: null,
  } satisfies SaveBuildState);

  return (
    <form action={formAction} className="space-y-2">
      {savedBuildId ? <input type="hidden" name="id" value={savedBuildId} /> : null}
      <input type="hidden" name="vehicleSlug" value={vehicleSlug} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      <input
        name="name"
        placeholder="Build name"
        defaultValue="Studio build"
        maxLength={80}
        className="w-full border border-[var(--line)] bg-white px-2 py-1 text-xs text-[var(--ink)]"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full border border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.14em] disabled:opacity-60"
      >
        {pending ? "Saving…" : savedBuildId ? "Update saved build" : "Save to account"}
      </button>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--ink)]">{state.success}</p> : null}
    </form>
  );
}
