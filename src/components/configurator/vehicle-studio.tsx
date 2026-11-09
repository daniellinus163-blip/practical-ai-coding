"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cameraPresets, type CameraPresetId } from "@/components/configurator/camera-presets";
import { StudioErrorBoundary } from "@/components/configurator/error-boundary";
import type { StudioTheme } from "@/components/configurator/studio-experience";
import { paintSwatches } from "@/configurator/capabilities";
import { groupPartsForUi, type ColorablePart } from "@/configurator/part-groups";
import type { PanelInfo } from "@/configurator/moving-panels";
import type { SceneInspection, Vehicle3DAsset } from "@/configurator/types";
import { InquiryForm } from "@/components/account/inquiry-form";
import { SaveBuildButton } from "@/components/account/save-build-button";
import { BackButton } from "@/components/layout/back-button";
import {
  encodeShareParam,
  liveConfigKey,
  sanitizePublicConfig,
  type PublicVehicleConfig,
} from "@/configurator/saved-config";
import { photoFor } from "@/lib/editorial-media";
import { VehicleStudioCanvasSkeleton } from "@/components/skeletons/vehicle-studio-canvas-skeleton";
import { cn } from "@/lib/utils";

const StudioExperience = dynamic(
  () => import("@/components/configurator/studio-experience").then((mod) => mod.StudioExperience),
  {
    ssr: false,
    loading: () => <VehicleStudioCanvasSkeleton />,
  },
);

type LoadState = "ready" | "missing" | "webgl-failed";

export function VehicleStudio({
  asset,
  modelName,
  vehicleId,
  initialConfig,
  savedBuildId,
}: {
  asset: Vehicle3DAsset;
  brandSlug: string;
  modelName: string;
  vehicleId: string;
  initialConfig?: PublicVehicleConfig | null;
  savedBuildId?: string | null;
}) {
  const restored = initialConfig
    ? sanitizePublicConfig(initialConfig, { id: vehicleId, slug: asset.vehicleSlug }, asset)
    : null;
  const stageRef = useRef<HTMLDivElement>(null);
  const photo = photoFor(asset.vehicleSlug);
  const [loadState, setLoadState] = useState<LoadState>("ready");
  const [modelLoading, setModelLoading] = useState(true);
  const [preset, setPreset] = useState<CameraPresetId>(restored?.preset ?? "threeQuarter");
  const [theme, setTheme] = useState<StudioTheme>(restored?.theme ?? "studio");
  const [paintId, setPaintId] = useState<string>(restored?.paintId ?? "original");
  const [caliperId, setCaliperId] = useState<string>(restored?.caliperId ?? "original");
  const [rimId, setRimId] = useState<string>(restored?.rimId ?? "original");
  const [inspection, setInspection] = useState<SceneInspection | null>(null);
  const [detected, setDetected] = useState<{ paint: string[]; rims: string[]; calipers: string[] }>({
    paint: [],
    rims: [],
    calipers: [],
  });
  const [parts, setParts] = useState<ColorablePart[]>([]);
  const [panels, setPanels] = useState<PanelInfo[]>([]);
  const [partColors, setPartColors] = useState<Record<string, string>>(restored?.partColors ?? {});
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>(restored?.openPanels ?? {});
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setModelLoading(true);
    });
    void (async () => {
      try {
        const response = await fetch(asset.publicUrl, { method: "HEAD", cache: "no-store" });
        if (!cancelled) {
          setLoadState(response.ok ? "ready" : "missing");
          if (!response.ok) setModelLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoadState("missing");
          setModelLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset.publicUrl]);

  const checkFile = useCallback(() => {
    window.location.reload();
  }, []);

  const onInspect = useCallback((report: SceneInspection) => {
    setInspection(report);
    setModelLoading(false);
  }, []);
  const onMaterials = useCallback(
    (next: { paint: string[]; rims: string[]; calipers: string[] }) => setDetected(next),
    [],
  );
  const onParts = useCallback((next: ColorablePart[]) => setParts(next), []);
  const onPanels = useCallback((next: PanelInfo[]) => setPanels(next), []);

  const paintNames = detected.paint.length
    ? detected.paint
    : asset.capabilities.paint.materialNameIncludes.filter((n) => n !== "__detect__");
  const paint = paintSwatches.find((item) => item.id === paintId);
  const caliper = paintSwatches.find((item) => item.id === caliperId);
  const rim = paintSwatches.find((item) => item.id === rimId);

  const doors = panels.filter((panel) => panel.kind === "door");
  const hood = panels.find((panel) => panel.kind === "hood");
  const boot = panels.find((panel) => panel.kind === "boot");
  const engine = panels.find((panel) => panel.kind === "engine");
  const doorsOpen = doors.length > 0 && doors.every((door) => openPanels[door.id]);
  const selected = parts.find((part) => part.id === selectedPartId) ?? null;

  const partGroups = useMemo(() => groupPartsForUi(parts), [parts]);

  const publicConfig = useMemo(
    () =>
      sanitizePublicConfig(
        { paintId, caliperId, rimId, preset, theme, partColors, openPanels },
        { id: vehicleId, slug: asset.vehicleSlug },
        asset,
        parts.length ? new Set(parts.map((part) => part.id)) : undefined,
      ),
    [asset, caliperId, openPanels, paintId, partColors, parts, preset, rimId, theme, vehicleId],
  );

  useEffect(() => {
    sessionStorage.setItem(liveConfigKey(asset.vehicleSlug), JSON.stringify(publicConfig));
  }, [asset.vehicleSlug, publicConfig]);

  function setPanelOpen(id: string, open: boolean) {
    setOpenPanels((current) => ({ ...current, [id]: open }));
  }

  function toggleAllDoors() {
    const next = !doorsOpen;
    setOpenPanels((current) => {
      const copy = { ...current };
      for (const door of doors) copy[door.id] = next;
      return copy;
    });
  }

  function colorGroup(groupName: string, hex: string | null) {
    setPartColors((current) => {
      const next = { ...current };
      for (const part of parts) {
        if (part.group !== groupName) continue;
        if (hex) next[part.id] = hex;
        else delete next[part.id];
      }
      return next;
    });
  }

  function colorSelected(hex: string | null) {
    if (!selectedPartId) return;
    setPartColors((current) => {
      const next = { ...current };
      if (hex) next[selectedPartId] = hex;
      else delete next[selectedPartId];
      return next;
    });
  }

  function resetAll() {
    setPreset("threeQuarter");
    setTheme("studio");
    setPaintId("original");
    setCaliperId("original");
    setRimId("original");
    setPartColors({});
    setOpenPanels({});
    setSelectedPartId(null);
  }

  function saveLocal() {
    localStorage.setItem(
      `formshift-config-${asset.vehicleSlug}`,
      JSON.stringify({ paintId, caliperId, rimId, preset, theme, partColors, openPanels }),
    );
  }

  async function share() {
    const url = new URL(window.location.href);
    url.searchParams.delete("paint");
    url.searchParams.delete("cam");
    url.searchParams.delete("build");
    url.searchParams.set("c", encodeShareParam(publicConfig));
    url.hash = "studio";
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section id="studio" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">3D studio</p>
          <h2 className="font-display text-3xl">Interactive viewer</h2>
        </div>
        {asset.upcomingVehicle ? (
          <p className="border border-[var(--accent)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            Upcoming / planned
          </p>
        ) : null}
      </div>

      <div className="grid overflow-hidden border border-[var(--line)] lg:grid-cols-[minmax(0,1fr)_22.5rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div
          ref={stageRef}
          className="relative h-[48vh] min-h-[320px] bg-[#d7d2c8] lg:h-[min(78vh,760px)]"
        >
        {loadState === "missing" ? (
            <ImageFallback
              src={photo.src}
              alt={photo.alt}
              credit={photo.credit}
              message={`Missing ${asset.publicUrl}. Copy the GLB from “3d car models” into public and retry.`}
              onRetry={checkFile}
            />
          ) : null}
          {loadState === "webgl-failed" ? (
            <ImageFallback src={photo.src} alt={photo.alt} credit={photo.credit} message="WebGL failed." onRetry={checkFile} />
          ) : null}
          {modelLoading && loadState === "ready" ? (
            <div className="pointer-events-none absolute inset-0 z-10">
              <VehicleStudioCanvasSkeleton />
            </div>
          ) : null}
          {loadState === "ready" ? (
            <StudioErrorBoundary
              fallback={
                <ImageFallback
                  src={photo.src}
                  alt={photo.alt}
                  credit={photo.credit}
                  message="The 3D runtime failed. Showing an editorial photograph."
                  onRetry={() => {
                    setModelLoading(true);
                    setLoadState("ready");
                    window.location.reload();
                  }}
                />
              }
            >
              <div className="absolute inset-0">
                <StudioExperience
                  glbUrl={asset.publicUrl}
                  vehicleSlug={asset.vehicleSlug}
                  paintHex={paint?.hex ?? null}
                  paintMaterialNames={paintNames}
                  caliperHex={caliper?.hex ?? null}
                  caliperMaterialNames={detected.calipers}
                  rimHex={rim?.hex ?? null}
                  rimMaterialNames={detected.rims}
                  partColors={partColors}
                  openPanels={openPanels}
                  selectedPartId={selectedPartId}
                  preset={preset}
                  theme={theme}
                  reducedMotion={reducedMotion}
                  onInspect={onInspect}
                  onMaterials={onMaterials}
                  onParts={onParts}
                  onPanels={onPanels}
                  onPartClick={setSelectedPartId}
                />
              </div>
            </StudioErrorBoundary>
          ) : null}
        </div>

        <aside className="flex h-[42vh] min-h-[280px] flex-col bg-[var(--card)] lg:h-[min(78vh,760px)]">
          <div className="shrink-0 border-b border-[var(--line)] px-4 py-3">
            <BackButton className="mb-2" />
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">Customization</p>
            <p className="font-display text-xl">Colour &amp; panels</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="space-y-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Doors &amp; lids</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={toggleAllDoors}
                    disabled={doors.length === 0}
                    className={cn(
                      "border px-3 py-2 text-xs uppercase tracking-[0.14em]",
                      doors.length === 0
                        ? "cursor-not-allowed border-[var(--line)] text-[var(--muted)]"
                        : doorsOpen
                          ? "on-dark border-[var(--ink)] bg-[var(--ink)]"
                          : "on-dark border-[var(--accent)] bg-[var(--accent)]",
                    )}
                  >
                    {doors.length === 0 ? "Doors not separate" : doorsOpen ? "Close the doors" : "Open the doors"}
                  </button>
                  {doors.map((door) => (
                    <button
                      key={door.id}
                      type="button"
                      onClick={() => setPanelOpen(door.id, !openPanels[door.id])}
                      className={cn(
                        "border px-3 py-2 text-xs uppercase tracking-[0.14em]",
                        openPanels[door.id] ? "border-[var(--ink)]" : "border-[var(--line)]",
                      )}
                    >
                      {openPanels[door.id] ? `Close ${door.label}` : `Open ${door.label}`}
                    </button>
                  ))}
                  {hood ? (
                    <button
                      type="button"
                      onClick={() => setPanelOpen(hood.id, !openPanels[hood.id])}
                      className="border border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.14em]"
                    >
                      {openPanels[hood.id] ? "Close the hood" : "Open the hood"}
                    </button>
                  ) : null}
                  {boot ? (
                    <button
                      type="button"
                      onClick={() => setPanelOpen(boot.id, !openPanels[boot.id])}
                      className={cn(
                        "border px-3 py-2 text-xs uppercase tracking-[0.14em]",
                        openPanels[boot.id]
                          ? "on-dark border-[var(--ink)] bg-[var(--ink)]"
                          : "on-dark border-[var(--accent)] bg-[var(--accent)]",
                      )}
                    >
                      {openPanels[boot.id] ? "Close the boot" : "Open the boot"}
                    </button>
                  ) : null}
                  {engine ? (
                    <button
                      type="button"
                      onClick={() => setPanelOpen(engine.id, !openPanels[engine.id])}
                      className="border border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.14em]"
                    >
                      {openPanels[engine.id] ? "Close the engine cover" : "Open the engine cover"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Camera &amp; studio</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(cameraPresets).map(([id, value]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPreset(id as CameraPresetId)}
                      className={cn(
                        "border px-3 py-2 text-xs uppercase tracking-[0.14em] transition",
                        preset === id
                          ? "on-dark border-[var(--ink)] bg-[var(--ink)]"
                          : "border-[var(--line)] hover:border-[var(--accent)]",
                      )}
                    >
                      {value.label}
                    </button>
                  ))}
                  {(Object.keys(themes) as StudioTheme[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTheme(id)}
                      className={cn(
                        "border px-3 py-2 text-xs uppercase tracking-[0.14em]",
                        theme === id ? "border-[var(--ink)]" : "border-[var(--line)]",
                      )}
                    >
                      {id}
                    </button>
                  ))}
                  <button type="button" onClick={resetAll} className="border border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.14em]">
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const node = stageRef.current;
                      if (!node) return;
                      if (document.fullscreenElement) void document.exitFullscreen();
                      else void node.requestFullscreen();
                    }}
                    className="border border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.14em]"
                  >
                    Fullscreen
                  </button>
                  <button type="button" onClick={saveLocal} className="border border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.14em]">
                    Save on this device
                  </button>
                  <SaveBuildButton
                    vehicleSlug={asset.vehicleSlug}
                    payload={publicConfig}
                    savedBuildId={savedBuildId}
                  />
                  <button type="button" onClick={() => void share()} className="border border-[var(--line)] px-3 py-2 text-xs uppercase tracking-[0.14em]">
                    {copied ? "Copied" : "Share"}
                  </button>
                </div>
              </div>

              {selected ? (
                <div className="border border-[var(--accent)] p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">Selected piece</p>
                  <p className="mt-1 font-display text-xl">{selected.group}</p>
                  <p className="text-xs text-[var(--muted)]">Colour applies only to this mesh.</p>
                  <ColorRow
                    hex={partColors[selected.id] ?? null}
                    onPick={(hex) => colorSelected(hex)}
                    onOriginal={() => colorSelected(null)}
                  />
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">Click any part of the car to edit that piece on its own.</p>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Part colours</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Each heading is the part that will change. Open the interior cameras to colour seats and the cabin.
                </p>
                <div className="mt-3 space-y-3">
                  {partGroups.map((group) => {
                    const applied = group.parts.map((part) => partColors[part.id]).find(Boolean) ?? null;
                    return (
                      <div key={group.name} className="border border-[var(--line)] p-3">
                        <p className="font-display text-lg leading-tight">{group.name}</p>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          {group.parts.length} mesh{group.parts.length === 1 ? "" : "es"}
                        </p>
                        <ColorRow
                          hex={applied}
                          onPick={(hex) => colorGroup(group.name, hex)}
                          onOriginal={() => colorGroup(group.name, null)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {inspection ? (
                <p className="pb-2 text-xs text-[var(--muted)]">
                  {inspection.triangleCount.toLocaleString()} triangles · {partGroups.length} parts
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      <p className="text-sm text-[var(--muted)]">
        Using <code>{asset.relativeFile}</code>. Colour changes appear on the model beside this panel.{" "}
        {modelName} trademarks remain with their owners. Share copies only the public colour and camera
        choices — never your account.
      </p>
      <InquiryForm
        vehicleSlug={asset.vehicleSlug}
        configuration={publicConfig}
        configurationId={savedBuildId}
      />
    </section>
  );
}

const themes = { studio: 1, dusk: 1, showroom: 1 };

function ColorRow({
  hex,
  onPick,
  onOriginal,
}: {
  hex: string | null;
  onPick: (hex: string) => void;
  onOriginal: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onOriginal}
        className={cn("border px-2 py-1 text-xs", !hex ? "border-[var(--ink)]" : "border-[var(--line)]")}
      >
        Original
      </button>
      {paintSwatches.map((swatch) => (
        <button
          key={swatch.id}
          type="button"
          onClick={() => onPick(swatch.hex)}
          className={cn("h-7 w-7 border-2", hex === swatch.hex ? "border-[var(--ink)]" : "border-transparent")}
          style={{ background: swatch.hex }}
          aria-label={swatch.label}
          title={swatch.label}
        />
      ))}
      <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
        Custom
        <input
          type="color"
          value={hex ?? "#808080"}
          onChange={(event) => onPick(event.target.value)}
          className="h-8 w-10 cursor-pointer border border-[var(--line)] bg-transparent"
        />
      </label>
    </div>
  );
}

function ImageFallback({
  src,
  alt,
  credit,
  message,
  onRetry,
}: {
  src: string;
  alt: string;
  credit: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="absolute inset-0">
      <Image src={src} alt={alt} fill className="object-cover" sizes="100vw" />
      <div className="on-dark absolute bottom-4 left-4 right-4 bg-black/60 p-3 text-sm">
        <p>
          {message} Editorial photograph ({credit}).
        </p>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="mt-2 bg-white px-3 py-1 text-black">
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

function getReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}
