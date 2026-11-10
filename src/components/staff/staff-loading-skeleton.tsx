import { Skeleton } from "@/components/ui/skeleton";

export function StaffPageSkeleton() {
  return (
    <div className="space-y-8" aria-busy aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32 skeleton-shimmer" />
        <Skeleton className="h-10 w-2/3 max-w-md skeleton-shimmer" />
        <Skeleton className="h-4 w-full max-w-xl skeleton-shimmer" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl skeleton-shimmer" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-52 rounded-xl skeleton-shimmer" />
        <Skeleton className="h-52 rounded-xl skeleton-shimmer" />
      </div>
      <Skeleton className="h-64 rounded-xl skeleton-shimmer" />
    </div>
  );
}

export function StaffLeadSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]" aria-busy aria-label="Loading lead">
      <p className="sr-only">Loading lead…</p>
      <div className="space-y-6">
        <Skeleton className="h-44 rounded-xl skeleton-shimmer" />
        <Skeleton className="h-56 rounded-xl skeleton-shimmer" />
        <Skeleton className="h-40 rounded-xl skeleton-shimmer" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-xl skeleton-shimmer" />
        <Skeleton className="h-36 rounded-xl skeleton-shimmer" />
        <Skeleton className="h-32 rounded-xl skeleton-shimmer" />
      </div>
    </div>
  );
}
