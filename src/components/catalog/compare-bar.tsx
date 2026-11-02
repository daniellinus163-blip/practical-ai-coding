import Link from "next/link";
import { COMPARE_LIMIT } from "@/catalog/query";

export function CompareBar({ slugs }: { slugs: string[] }) {
  if (slugs.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-[var(--brass)] bg-[var(--card)] px-4 py-3 text-sm">
      <p>
        {slugs.length} of {COMPARE_LIMIT} selected for comparison.
      </p>
      <Link
        href={`/compare?ids=${slugs.join(",")}`}
        className="on-dark bg-[var(--ink)] px-4 py-2 hover:bg-[var(--brass)]"
      >
        Open compare
      </Link>
    </div>
  );
}
