import type { ConfigurationDetailRow } from "@/crm/configuration-summary";

export function LeadConfigurationPanel({
  rows,
  vehicleHref,
  previewNote,
}: {
  rows: ConfigurationDetailRow[];
  vehicleHref: string | null;
  previewNote: string | null;
}) {
  if (rows.length === 0) {
    return (
      <section className="border border-dashed border-[var(--line)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
        No 3D studio configuration was attached to this inquiry.
      </section>
    );
  }

  return (
    <section className="border border-[var(--line)] bg-[var(--card)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl">Vehicle configuration</h3>
        {vehicleHref ? (
          <a className="text-xs underline" href={vehicleHref}>
            Open in catalog
          </a>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Captured from the customer studio at submission. Estimated price is not calculated in this app.
      </p>
      {previewNote ? (
        <p className="mt-2 rounded border border-[var(--line)] bg-[var(--bg-2)]/40 px-3 py-2 text-xs text-[var(--muted)]">
          {previewNote}
        </p>
      ) : null}
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{row.label}</dt>
            <dd className="mt-0.5 text-[var(--ink)]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
