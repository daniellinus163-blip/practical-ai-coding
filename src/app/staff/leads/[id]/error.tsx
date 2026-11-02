"use client";

export default function LeadError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-3xl">Lead could not be loaded</h2>
      <p className="text-sm text-[var(--muted)]">
        The staff lead page failed before the record could be shown. Nothing was changed.
      </p>
      <button type="button" className="text-sm underline" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
