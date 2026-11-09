"use client";

import { ContactShadows, Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Box3, Color, Vector3, type Mesh, type MeshStandardMaterial } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { cameraPresets, type CameraPresetId } from "@/components/configurator/camera-presets";
import { applyBodyWrap, stashOriginalMaps } from "@/configurator/apply-wrap";
import { detectConfigurableMaterials } from "@/configurator/detect-materials";
import {
  applyNamedMaterialColor,
  inspectScene,
  restoreOriginalColors,
  stashOriginalColors,
} from "@/configurator/inspect-scene";
import { applyPartColors, catalogColorableParts, partIdFromObject, type ColorablePart } from "@/configurator/part-catalog";
import { interiorCameraFromBounds, type StudioCameraFrame, type StudioViewMode } from "@/configurator/studio-camera";
import { alignNoseToPositiveZ } from "@/configurator/vehicle-facing";
import type { WrapDesignId } from "@/configurator/wrap-designs";
import type { SceneInspection } from "@/configurator/types";

export type StudioTheme = "studio" | "dusk" | "showroom";

const themes: Record<StudioTheme, string> = {
  studio: "#d7d2c8",
  dusk: "#8a93a3",
  showroom: "#eceae4",
};

export function StudioExperience({
  glbUrl,
  vehicleSlug: _vehicleSlug = "",
  paintHex,
  paintMaterialNames,
  caliperHex,
  caliperMaterialNames,
  rimHex,
  rimMaterialNames,
  partColors = {},
  wrapId = "none",
  selectedPartId = null,
  preset,
  viewMode,
  theme,
  reducedMotion,
  onInspect,
  onMaterials,
  onParts,
  onPartClick,
  onInteriorFrame,
  lite = false,
}: {
  glbUrl: string;
  vehicleSlug?: string;
  paintHex: string | null;
  paintMaterialNames: string[];
  caliperHex: string | null;
  caliperMaterialNames: string[];
  rimHex: string | null;
  rimMaterialNames: string[];
  partColors?: Record<string, string>;
  wrapId?: WrapDesignId;
  selectedPartId?: string | null;
  preset: CameraPresetId;
  viewMode: StudioViewMode;
  theme: StudioTheme;
  reducedMotion: boolean;
  onInspect: (report: SceneInspection) => void;
  onMaterials: (detected: { paint: string[]; rims: string[]; calipers: string[] }) => void;
  onParts?: (parts: ColorablePart[]) => void;
  onPartClick?: (partId: string) => void;
  onInteriorFrame?: (frame: StudioCameraFrame) => void;
  lite?: boolean;
}) {
  const interiorFrameRef = useRef<StudioCameraFrame>({
    position: [...cameraPresets.cabin.position],
    target: [...cameraPresets.cabin.target],
  });

  return (
    <Canvas
      className="h-full w-full"
      style={{ width: "100%", height: "100%", display: "block" }}
      shadows={!lite}
      dpr={lite ? [1, 1] : [1, 1.25]}
      frameloop={lite ? "demand" : "always"}
      camera={{ position: cameraPresets.threeQuarter.position, fov: 36, near: 0.1, far: 100 }}
      gl={{ antialias: !lite, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[themes[theme]]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#f4f0e8", "#6d6a64", 0.7]} />
      <directionalLight
        castShadow={!lite}
        position={[6, 10, 5]}
        intensity={1.7}
        shadow-mapSize={lite ? [512, 512] : [1024, 1024]}
      />
      <directionalLight position={[-6, 4, -3]} intensity={0.4} color="#9eb6d4" />
      <directionalLight position={[0, 3, -6]} intensity={0.25} />
      <Suspense fallback={null}>
        <FittedVehicle
          url={glbUrl}
          paintHex={paintHex}
          paintMaterialNames={paintMaterialNames}
          caliperHex={caliperHex}
          caliperMaterialNames={caliperMaterialNames}
          rimHex={rimHex}
          rimMaterialNames={rimMaterialNames}
          partColors={partColors}
          wrapId={wrapId}
          selectedPartId={selectedPartId}
          onInspect={onInspect}
          onMaterials={onMaterials}
          onParts={onParts}
          onPartClick={onPartClick}
          onInteriorFrame={(frame) => {
            interiorFrameRef.current = frame;
            onInteriorFrame?.(frame);
          }}
          lite={lite}
        />
        {lite ? null : <Environment preset="studio" environmentIntensity={0.55} />}
      </Suspense>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={!lite}>
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial color={theme === "dusk" ? "#6f7380" : "#cfc8ba"} roughness={0.82} metalness={0.08} />
      </mesh>
      {lite ? null : <ContactShadows opacity={0.32} scale={11} blur={2.4} far={5} />}
      <StudioOrbitControls viewMode={viewMode} />
      <CameraPresetController
        preset={preset}
        viewMode={viewMode}
        interiorFrameRef={interiorFrameRef}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}

function FittedVehicle({
  url,
  paintHex,
  paintMaterialNames,
  caliperHex,
  caliperMaterialNames,
  rimHex,
  rimMaterialNames,
  partColors,
  wrapId,
  selectedPartId,
  onInspect,
  onMaterials,
  onParts,
  onPartClick,
  onInteriorFrame,
  lite = false,
}: {
  url: string;
  paintHex: string | null;
  paintMaterialNames: string[];
  caliperHex: string | null;
  caliperMaterialNames: string[];
  rimHex: string | null;
  rimMaterialNames: string[];
  partColors: Record<string, string>;
  wrapId: WrapDesignId;
  selectedPartId: string | null;
  onInspect: (report: SceneInspection) => void;
  onMaterials: (detected: { paint: string[]; rims: string[]; calipers: string[] }) => void;
  onParts?: (parts: ColorablePart[]) => void;
  onPartClick?: (partId: string) => void;
  onInteriorFrame?: (frame: StudioCameraFrame) => void;
  lite?: boolean;
}) {
  const gltf = useGLTF(url);
  const prepared = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = !lite;
      mesh.receiveShadow = !lite;
      if (lite) return;
      if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((material) => material.clone());
      else mesh.material = mesh.material.clone();
    });
    if (!lite) {
      stashOriginalColors(clone);
      stashOriginalMaps(clone);
    }
    try {
      alignNoseToPositiveZ(clone);
    } catch {
      // Some exports mis-label wheels; skip auto-facing rather than break the studio.
    }
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    const scale = 4.4 / longest;
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    clone.updateMatrixWorld(true);
    const parts = lite ? [] : catalogColorableParts(clone);
    const fittedBox = new Box3().setFromObject(clone);
    const interiorFrame = interiorCameraFromBounds(fittedBox);
    return { clone, parts, interiorFrame };
  }, [gltf.scene, lite]);

  useLayoutEffect(() => {
    onInteriorFrame?.(prepared.interiorFrame);
  }, [onInteriorFrame, prepared.interiorFrame]);

  const { clone } = prepared;

  useLayoutEffect(() => {
    onInspect(inspectScene(clone));
    onMaterials(detectConfigurableMaterials(clone));
    onParts?.(prepared.parts);
  }, [clone, prepared.parts, onInspect, onMaterials, onParts]);

  useLayoutEffect(() => {
    if (lite) return;
    restoreOriginalColors(clone);
    if (paintHex && paintMaterialNames.length) {
      applyNamedMaterialColor(clone, paintMaterialNames, paintHex);
    }
    applyBodyWrap(clone, paintMaterialNames, wrapId, paintHex);
    if (caliperHex && caliperMaterialNames.length) {
      applyNamedMaterialColor(clone, caliperMaterialNames, caliperHex);
    }
    if (rimHex && rimMaterialNames.length) {
      applyNamedMaterialColor(clone, rimMaterialNames, rimHex);
    }
    applyPartColors(clone, partColors);
    clone.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of mats) {
        const std = material as MeshStandardMaterial;
        if (!("emissive" in std) || !std.emissive) continue;
        const id = material.userData?.formshiftPartId as string | undefined;
        if (id && id === selectedPartId) {
          std.emissive = std.emissive ?? new Color();
          std.emissive.set("#3b6ea8");
          std.emissiveIntensity = 0.35;
        } else {
          std.emissiveIntensity = 0;
        }
      }
    });
  }, [
    clone,
    paintHex,
    paintMaterialNames,
    wrapId,
    caliperHex,
    caliperMaterialNames,
    rimHex,
    rimMaterialNames,
    partColors,
    selectedPartId,
    lite,
  ]);

  return (
    <primitive
      object={clone}
      onClick={(event: { stopPropagation: () => void; object: Mesh }) => {
        event.stopPropagation();
        const id = partIdFromObject(event.object);
        if (id) onPartClick?.(id);
      }}
    />
  );
}

function StudioOrbitControls({ viewMode }: { viewMode: StudioViewMode }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (viewMode === "interior") {
      controls.minDistance = 0.06;
      controls.maxDistance = 0.72;
      controls.minPolarAngle = 0.82;
      controls.maxPolarAngle = 1.42;
      controls.enablePan = false;
      controls.enableZoom = true;
    } else {
      controls.minDistance = 0.45;
      controls.maxDistance = 16;
      controls.minPolarAngle = 0.08;
      controls.maxPolarAngle = Math.PI / 2.02;
      controls.enablePan = true;
      controls.enableZoom = true;
    }
    controls.update();
  }, [viewMode]);

  return <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} />;
}

function CameraPresetController({
  preset,
  viewMode,
  interiorFrameRef,
  reducedMotion,
}: {
  preset: CameraPresetId;
  viewMode: StudioViewMode;
  interiorFrameRef: MutableRefObject<StudioCameraFrame>;
  reducedMotion: boolean;
}) {
  const { camera, controls } = useThree();

  useEffect(() => {
    const exteriorPreset = preset === "cabin" ? "threeQuarter" : preset;
    const next =
      viewMode === "interior" ? interiorFrameRef.current : cameraPresets[exteriorPreset];
    camera.position.set(...next.position);
    const orbit = controls as unknown as { target?: Vector3; update?: () => void } | null;
    if (orbit?.target) {
      orbit.target.set(...next.target);
      orbit.update?.();
    }
    camera.updateProjectionMatrix();
  }, [camera, controls, interiorFrameRef, preset, reducedMotion, viewMode]);

  return null;
}
