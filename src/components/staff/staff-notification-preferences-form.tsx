"use client";

import { useActionState } from "react";
import { updateStaffNotificationPreferencesAction } from "@/app/staff/notifications/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { StaffNotificationType } from "@/crm/staff-notification-types";

type Item = { type: StaffNotificationType; label: string; enabled: boolean };

export function StaffNotificationPreferencesForm({ items }: { items: Item[] }) {
  const [state, action, pending] = useActionState(updateStaffNotificationPreferencesAction, {
    error: null,
    success: null,
  });

  return (
    <form action={action} className="space-y-4 rounded-md border border-[var(--line)] p-4">
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.type} className="flex items-start gap-3">
            <input
              type="checkbox"
              id={item.type}
              name={`type_${item.type}`}
              value="on"
              defaultChecked={item.enabled}
              className="mt-1"
            />
            <Label htmlFor={item.type} className="cursor-pointer text-sm font-normal">
              <span className="font-medium text-[var(--ink)]">{item.label}</span>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">{item.type}</span>
            </Label>
          </li>
        ))}
      </ul>
      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--accent)]">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}
