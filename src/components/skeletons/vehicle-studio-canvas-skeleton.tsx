import { Shimmer } from "@/components/skeletons/home-page-skeleton";

/** Fills only the WebGL viewport while the GLB or R3F bundle loads. */
export function VehicleStudioCanvasSkeleton() {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-[#d7d2c8] p-6"
      aria-busy="true"
      aria-label="Loading 3D model"
    >
      <div className="relative h-full w-full max-w-xl">
        <Shimmer className="absolute inset-[16%_6%_20%_6%] rounded-[38%_38%_10%_10%] opacity-90" />
        <Shimmer className="absolute bottom-[10%] left-[10%] h-12 w-12 rounded-full opacity-65" />
        <Shimmer className="absolute bottom-[10%] right-[10%] h-12 w-12 rounded-full opacity-65" />
      </div>
    </div>
  );
}
