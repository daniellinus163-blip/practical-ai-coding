import { statusCopy } from "@/catalog/labels";
import type { VehicleStatus } from "@/catalog/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: VehicleStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-sm bg-card/90 text-[10px] uppercase tracking-[0.16em]",
        status === "upcoming" || status === "announced" || status === "concept"
          ? "border-[var(--brass)] text-[var(--brass)]"
          : status === "production_ended"
            ? "border-border text-muted-foreground"
            : "border-foreground text-foreground",
      )}
    >
      {statusCopy[status]}
    </Badge>
  );
}
