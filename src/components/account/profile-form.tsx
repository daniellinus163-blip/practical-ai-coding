"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/auth/actions";
import { COUNTRIES } from "@/lib/countries";

export function ProfileForm({
  displayName,
  phone,
  country,
  city,
  preferredContact,
}: {
  displayName: string;
  phone: string;
  country: string;
  city: string;
  preferredContact: "email" | "phone";
}) {
  const [state, action, pending] = useActionState(updateProfileAction, {
    error: null,
    success: null,
  });

  return (
    <form action={action} className="space-y-8">
      <section className="border border-[var(--line)] bg-[var(--card)] p-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">Identity</p>
        <h2 className="font-display mt-1 text-2xl">How we address you</h2>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
          This name appears on saved builds and inquiries. It is not shown publicly on the catalog.
        </p>
        <label className="mt-5 block text-sm">
          Display name
          <input
            name="displayName"
            defaultValue={displayName}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2.5"
          />
        </label>
      </section>

      <section className="border border-[var(--line)] bg-[var(--card)] p-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">Contact</p>
        <h2 className="font-display mt-1 text-2xl">How to reach you</h2>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
          Only used for inquiry follow-up. We do not sell this information.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            Phone
            <input
              name="phone"
              defaultValue={phone}
              autoComplete="tel"
              inputMode="tel"
              placeholder="+44 7700 900000"
              className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            Preferred contact
            <select
              name="preferredContact"
              defaultValue={preferredContact}
              className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2.5"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
          </label>
          <label className="block text-sm">
            Country
            <select
              name="country"
              defaultValue={country}
              className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2.5"
            >
              <option value="">Select country</option>
              {COUNTRIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              {country && !(COUNTRIES as readonly string[]).includes(country) ? (
                <option value={country}>{country}</option>
              ) : null}
            </select>
          </label>
          <label className="block text-sm">
            City
            <input
              name="city"
              defaultValue={city}
              autoComplete="address-level2"
              maxLength={80}
              className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2.5"
            />
          </label>
        </div>
      </section>

      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--ink)]">{state.success}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="on-dark bg-[var(--ink)] px-5 py-2.5 text-sm disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <p className="text-xs text-[var(--muted)]">Changes apply only to your FormShift account.</p>
      </div>
    </form>
  );
}
