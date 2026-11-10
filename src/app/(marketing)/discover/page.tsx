import { Suspense } from "react";
import { CompareBar } from "@/components/catalog/compare-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/catalog/empty-state";
import { FactLegend } from "@/components/catalog/fact-legend";
import { VehicleCard } from "@/components/catalog/vehicle-card";
import { VehicleFilters } from "@/components/catalog/vehicle-filters";
import { catalogRepository } from "@/catalog/local-repository";
import { queryCatalog, uniqueBodyStyles, uniqueBrands, uniqueStatuses } from "@/catalog/query";
import { parseCatalogFilters, parseCompareParam } from "@/catalog/url";

export const metadata = {
  title: "Discover cars — digital vehicle showroom",
  description:
    "Browse the FormShift AI catalog: luxury and performance vehicles with honest specs, filters by brand, and links to each online 3D configurator studio.",
  alternates: { canonical: "/discover" },
};

export default function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<DiscoverFallback />}>
      <DiscoverResults searchParams={searchParams} />
    </Suspense>
  );
}

function DiscoverFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="aspect-[16/10] w-full" />
        <Skeleton className="aspect-[16/10] w-full" />
      </div>
    </div>
  );
}

async function DiscoverResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const vehicles = await catalogRepository.listVehicles();
  const filters = parseCatalogFilters(params);
  const compare = parseCompareParam(params.compare);
  const results = queryCatalog(vehicles, filters);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brass)]">Catalog</p>
        <h1 className="font-display mt-2 text-4xl">Discover cars</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Structured local seed data. Additional brands and models can be added as records without
          rewriting these components.
        </p>
      </div>
      <FactLegend />
      <VehicleFilters
        brands={uniqueBrands(vehicles)}
        bodyStyles={uniqueBodyStyles(vehicles)}
        statuses={uniqueStatuses(vehicles)}
        current={filters}
        compare={compare}
      />
      <CompareBar slugs={compare} />
      {results.length === 0 ? (
        <EmptyState
          title="No vehicles match"
          body="Clear a filter or search term. The catalog currently contains thirteen seeded models."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {results.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} compareSlugs={compare} />
          ))}
        </div>
      )}
    </div>
  );
}
