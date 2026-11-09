"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useState } from "react";
import { extraModels } from "@/configurator/manifest";
import { editorialPhotos } from "@/lib/editorial-media";
import type { SceneInspection } from "@/configurator/types";

const StudioExperience = dynamic(
  () => import("@/components/configurator/studio-experience").then((mod) => mod.StudioExperience),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#d7d2c8] text-sm text-[var(--ink)]">
        Loading 3D preview…
      </div>
    ),
  },
);

export function StudioTeaser() {
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const onInspect = useCallback((report: SceneInspection) => {
    void report;
  }, []);
  const onMaterials = useCallback(() => {}, []);
  const photo = editorialPhotos.hero;

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="relative block h-[420px] w-full overflow-hidden border border-[var(--line)] bg-[#d7d2c8] text-left"
      >
        <Image src={photo.src} alt={photo.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />
        <span className="absolute inset-0 bg-[var(--ink)]/25" />
        <span className="absolute bottom-4 left-4 right-4 bg-white px-4 py-3 text-sm text-[var(--ink)]">
          Load live 3D preview (small Chiron file). The page stays fast until you click.
        </span>
      </button>
    );
  }

  if (failed) {
    return (
      <div className="flex h-[420px] items-center justify-center border border-[var(--line)] bg-[var(--card)] text-sm text-[var(--ink)]">
        3D preview failed.
        <button type="button" className="ml-3 underline" onClick={() => setFailed(false)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-[420px] w-full overflow-hidden border border-[var(--line)] bg-[#d7d2c8]">
      <StudioExperience
        glbUrl={extraModels.homepageHero}
        paintHex={null}
        paintMaterialNames={[]}
        caliperHex={null}
        caliperMaterialNames={[]}
        rimHex={null}
        rimMaterialNames={[]}
        preset="threeQuarter"
        viewMode="exterior"
        theme="studio"
        reducedMotion={false}
        lite
        onInspect={onInspect}
        onMaterials={onMaterials}
      />
    </div>
  );
}
