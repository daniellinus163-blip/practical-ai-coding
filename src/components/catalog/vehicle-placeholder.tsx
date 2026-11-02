import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  tesla: "from-[#1a1f24] to-[#0b0b0c]",
  bugatti: "from-[#1a2230] to-[#0b0b0c]",
  lamborghini: "from-[#2a2416] to-[#0b0b0c]",
};

export function VehiclePlaceholder({
  brandSlug,
  title,
  className,
}: {
  brandSlug: string;
  title: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-[16/10] items-end overflow-hidden bg-gradient-to-br p-4",
        tones[brandSlug] ?? "from-[#222] to-[#0b0b0c]",
        className,
      )}
    >
      <div className="absolute inset-x-8 top-1/3 h-px bg-[var(--brass)]/40" />
      <div className="absolute inset-y-8 left-1/2 w-px bg-[var(--brass)]/20" />
      <p className="relative text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Placeholder · {title}
      </p>
    </div>
  );
}
