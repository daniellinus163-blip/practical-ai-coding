export function FactLegend() {
  return (
    <div className="border border-[var(--line)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--brass)]">
        How facts are labelled
      </p>
      <ul className="grid gap-2 md:grid-cols-2">
        <li>
          <strong className="text-[var(--ink)]">Confirmed</strong> — published by the manufacturer
          for this model or trim.
        </li>
        <li>
          <strong className="text-[var(--ink)]">Announced</strong> — described, not production-confirmed.
        </li>
        <li>
          <strong className="text-[var(--ink)]">Unavailable</strong> — not listed or omitted (including price).
        </li>
        <li>
          <strong className="text-[var(--ink)]">Estimate</strong> — not used in the current seed set.
        </li>
      </ul>
    </div>
  );
}
