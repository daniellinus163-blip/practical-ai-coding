import { statusCopy } from "@/catalog/labels";
import type { VehicleStatus } from "@/catalog/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: VehicleStatus }) {
  return (
    <span
      className={cn(
        "inline-flex border bg-[var(--card)]/90 px-2 py-1 text-[10px] uppercase tracking-[0.16em]",
        status === "upcoming" || status === "announced" || status === "concept"
          ? "border-[var(--brass)] text-[var(--brass)]"
          : status === "production_ended"
            ? "border-[var(--muted)] text-[var(--muted)]"
            : "border-[var(--ink)] text-[var(--ink)]",
      )}
    >
      {statusCopy[status]}
    </span>
  );
}
