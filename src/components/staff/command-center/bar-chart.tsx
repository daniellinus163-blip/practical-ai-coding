export type BarDatum = { label: string; value: number; hint?: string };

export function HorizontalBarChart({
  data,
  emptyTitle,
  emptyBody,
}: {
  data: BarDatum[];
  emptyTitle: string;
  emptyBody: string;
}) {
  const total = data.reduce((sum, row) => sum + row.value, 0);
  if (total === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--card)] px-4 py-10 text-center">
        <p className="text-sm font-medium text-[var(--ink)]">{emptyTitle}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{emptyBody}</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="space-y-2">
      {data.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-[var(--ink)]" title={row.hint ?? row.label}>
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums text-[var(--muted)]">{row.value}</span>
          </div>
          <div className="mt-1 h-2 w-full bg-[var(--line)]/40">
            <div
              className="h-2 bg-[var(--ink)]/80"
              style={{ width: `${Math.max(4, Math.round((row.value / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function VerticalBarChart({
  data,
  emptyTitle,
  emptyBody,
}: {
  data: Array<{ label: string; value: number }>;
  emptyTitle: string;
  emptyBody: string;
}) {
  const total = data.reduce((sum, row) => sum + row.value, 0);
  if (total === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--card)] px-4 py-10 text-center">
        <p className="text-sm font-medium text-[var(--ink)]">{emptyTitle}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{emptyBody}</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex h-40 items-end justify-between gap-1 border border-[var(--line)] bg-[var(--card)] px-2 pb-2 pt-3">
      {data.map((row) => (
        <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="text-[10px] tabular-nums text-[var(--muted)]">{row.value || ""}</span>
          <div
            className="w-full max-w-[2.25rem] bg-[var(--ink)]/75"
            style={{ height: `${Math.max(row.value ? 8 : 2, Math.round((row.value / max) * 112))}px` }}
            title={`${row.label}: ${row.value}`}
          />
          <span className="w-full truncate text-center text-[9px] text-[var(--muted)]" title={row.label}>
            {row.label.slice(8)}
          </span>
        </div>
      ))}
    </div>
  );
}
