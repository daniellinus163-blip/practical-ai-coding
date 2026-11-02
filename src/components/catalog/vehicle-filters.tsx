"use client";

import { useRouter } from "next/navigation";
import { bodyCopy, statusCopy } from "@/catalog/labels";
import type { BodyStyle, CatalogFilters, VehicleStatus } from "@/catalog/types";

export function VehicleFilters({
  brands,
  bodyStyles,
  statuses,
  current,
  compare,
}: {
  brands: Array<{ slug: string; name: string }>;
  bodyStyles: BodyStyle[];
  statuses: VehicleStatus[];
  current: CatalogFilters;
  compare: string[];
}) {
  const router = useRouter();

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      if (typeof value === "string" && value && value !== "all") params.set(key, value);
    }
    router.replace(params.size ? `/discover?${params}` : "/discover");
  }

  return (
    <form
      method="get"
      action="/discover"
      onChange={(event) => {
        const target = event.target;
        if (target instanceof HTMLSelectElement) apply(event.currentTarget);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        apply(event.currentTarget);
      }}
      className="grid gap-3 border border-[var(--line)] bg-[var(--card)] p-4 md:grid-cols-5"
    >
      {compare.length > 0 ? <input type="hidden" name="compare" value={compare.join(",")} /> : null}
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Search
        <input
          name="q"
          defaultValue={current.query ?? ""}
          className="border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
          placeholder="Brand or model"
        />
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Brand
        <select
          name="brand"
          defaultValue={current.brand ?? "all"}
          className="border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
        >
          <option value="all">All brands</option>
          {brands.map((brand) => (
            <option key={brand.slug} value={brand.slug}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Body style
        <select
          name="body"
          defaultValue={current.bodyStyle ?? "all"}
          className="border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
        >
          <option value="all">All styles</option>
          {bodyStyles.map((style) => (
            <option key={style} value={style}>
              {bodyCopy[style]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Status
        <select
          name="status"
          defaultValue={current.status ?? "all"}
          className="border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
        >
          <option value="all">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {statusCopy[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Sort
        <select
          name="sort"
          defaultValue={current.sort ?? "name"}
          className="border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
        >
          <option value="name">Name</option>
          <option value="brand">Brand</option>
          <option value="status">Status</option>
          <option value="year">Model year</option>
        </select>
      </label>
      <button
        type="submit"
        className="on-dark bg-[var(--ink)] px-4 py-2 text-sm hover:bg-[var(--brass)] md:col-span-5"
      >
        Apply filters
      </button>
    </form>
  );
}
