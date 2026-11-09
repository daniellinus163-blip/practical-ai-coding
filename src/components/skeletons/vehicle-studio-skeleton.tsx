import { Shimmer } from "@/components/skeletons/home-page-skeleton";

/** Placeholder for the 3D viewport + customization column while WebGL and the GLB load. */
export function VehicleStudioSkeleton() {
  return (
    <section className="space-y-3" aria-busy="true" aria-label="Loading 3D studio">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-9 w-52" />
        </div>
        <Shimmer className="hidden h-7 w-32 sm:block" />
      </div>

      <div className="grid overflow-hidden border border-[var(--line)] lg:grid-cols-[minmax(0,1fr)_22.5rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="relative flex h-[48vh] min-h-[320px] items-center justify-center bg-[#d7d2c8] p-8 lg:h-[min(78vh,760px)]">
          <div className="relative h-full w-full max-w-2xl">
            <Shimmer className="absolute inset-[18%_8%_22%_8%] rounded-[40%_40%_12%_12%] opacity-90" />
            <Shimmer className="absolute bottom-[12%] left-[12%] h-14 w-14 rounded-full opacity-70" />
            <Shimmer className="absolute bottom-[12%] right-[12%] h-14 w-14 rounded-full opacity-70" />
          </div>
          <p className="absolute bottom-4 left-4 text-xs text-[var(--muted)]">Loading 3D model…</p>
        </div>

        <aside className="flex h-[42vh] min-h-[280px] flex-col bg-[var(--card)] lg:h-[min(78vh,760px)]">
          <div className="shrink-0 space-y-2 border-b border-[var(--line)] px-4 py-3">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-7 w-40" />
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-hidden px-4 py-4">
            <MotionBlock labelWidth="w-24" rows={3} />
            <MotionBlock labelWidth="w-28" rows={4} />
            <MotionBlock labelWidth="w-20" rows={5} />
          </div>
        </aside>
      </div>
    </section>
  );
}

function MotionBlock({ labelWidth, rows }: { labelWidth: string; rows: number }) {
  return (
    <div>
      <Shimmer className={`mb-2 h-3 ${labelWidth}`} />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <Shimmer key={i} className="h-9 w-[5.5rem]" />
        ))}
      </div>
    </div>
  );
}
