export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bg)]" aria-busy="true" aria-label="Loading FormShift AI">
      <div className="border-b border-[var(--line)] px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Shimmer className="h-6 w-36" />
          <div className="hidden gap-4 md:flex">
            <Shimmer className="h-4 w-16" />
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-4 w-16" />
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2">
        <div className="space-y-4">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="h-16 w-full" />
          <Shimmer className="h-16 w-4/5" />
          <Shimmer className="h-20 w-full" />
          <div className="flex gap-3">
            <Shimmer className="h-11 w-36" />
            <Shimmer className="h-11 w-36" />
          </div>
        </div>
        <Shimmer className="h-[420px] w-full" />
      </div>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 md:grid-cols-3">
        <Shimmer className="h-28" />
        <Shimmer className="h-28" />
        <Shimmer className="h-28" />
      </div>
    </div>
  );
}

export function VehicleCardSkeleton() {
  return <Shimmer className="aspect-[16/10] w-full" />;
}

function Shimmer({ className }: { className: string }) {
  return <div className={`skeleton-shimmer ${className}`} />;
}
