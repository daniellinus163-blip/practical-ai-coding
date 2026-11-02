"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { COMPARE_LIMIT } from "@/catalog/query";

export function CompareToggle({ slug, selected }: { slug: string; selected: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const checked = selected.includes(slug);

  function onChange() {
    const next = new Set(selected);
    if (checked) next.delete(slug);
    else if (next.size < COMPARE_LIMIT) next.add(slug);
    const params = new URLSearchParams(searchParams.toString());
    const value = [...next].join(",");
    if (value) params.set("compare", value);
    else params.delete("compare");
    if (pathname === "/compare") {
      if (value) params.set("ids", value);
      else params.delete("ids");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted)]">
      <input
        type="checkbox"
        className="h-4 w-4 accent-[var(--brass)]"
        checked={checked}
        onChange={onChange}
        disabled={!checked && selected.length >= COMPARE_LIMIT}
      />
      Compare
    </label>
  );
}
