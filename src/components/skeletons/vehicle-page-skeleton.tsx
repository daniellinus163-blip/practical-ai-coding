import { VehicleStudioSkeleton } from "@/components/skeletons/vehicle-studio-skeleton";
import { Shimmer } from "@/components/skeletons/home-page-skeleton";

/** Shown while a /cars/[slug] route is loading (navigation or Suspense). */
export function VehiclePageSkeleton() {
  return (
    <div className="space-y-10 py-12" aria-busy="true" aria-label="Loading vehicle">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-4">
        <div className="space-y-3">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-14 w-64 md:w-80" />
          <Shimmer className="h-4 w-48" />
        </div>
        <Shimmer className="h-8 w-28" />
      </div>

      <div className="mx-auto max-w-[92rem] px-4">
        <VehicleStudioSkeleton />
      </div>

      <Shimmer className="mx-auto h-4 w-full max-w-6xl px-4 md:w-[85%]" />

      <div className="mx-auto max-w-6xl space-y-3 px-4">
        <Shimmer className="h-5 w-full" />
        <Shimmer className="h-5 w-[92%]" />
        <Shimmer className="h-5 w-[78%]" />
      </div>

      <Shimmer className="mx-auto block h-24 w-full max-w-6xl px-4" />

      <div className="mx-auto max-w-6xl space-y-8 px-4">
        <div className="space-y-3">
          <Shimmer className="h-8 w-56" />
          <Shimmer className="h-20 w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Shimmer className="h-32" />
          <Shimmer className="h-32" />
          <Shimmer className="h-32" />
          <Shimmer className="h-32" />
        </div>
        <Shimmer className="h-40 w-full" />
      </div>
    </div>
  );
}
