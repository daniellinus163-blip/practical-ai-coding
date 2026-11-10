import Link from "next/link";
import { Suspense } from "react";
import { CompareTable } from "@/components/catalog/compare-table";
import { EmptyState } from "@/components/catalog/empty-state";
import { FactLegend } from "@/components/catalog/fact-legend";
import { catalogRepository } from "@/catalog/local-repository";
import { COMPARE_LIMIT } from "@/catalog/query";
import { parseCompareParam } from "@/catalog/url";

export const metadata = {
  title: "Compare vehicles",
  description:
    "Side-by-side specification comparison for vehicles in the FormShift AI catalog. Open any model’s 3D configurator from your shortlist.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-12 text-[var(--muted)]">Loading comparison…</p>}>
      <CompareResults searchParams={searchParams} />
    </Suspense>
  );
}

async function CompareResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const slugs = parseCompareParam(params.ids ?? params.compare).slice(0, COMPARE_LIMIT);
  const vehicles = await catalogRepository.getVehiclesBySlugs(slugs);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brass)]">Catalog</p>
        <h1 className="font-display mt-2 text-4xl">Compare</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Compare two or three vehicles. Missing values stay blank and are labelled unavailable —
          they are not filled in.
        </p>
      </div>
      <FactLegend />
      {vehicles.length < 2 ? (
        <EmptyState
          title="Select vehicles to compare"
          body="Open Discover Cars, tick Compare on at least two models, then return here."
        />
      ) : (
        <CompareTable vehicles={vehicles} />
      )}
      <Link href="/discover" className="inline-block text-sm text-[var(--brass)]">
        Back to discover
      </Link>
    </div>
  );
}
