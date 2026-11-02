import type { Material, Mesh, Object3D } from "three";
import { Box3, Vector3 } from "three";
import type { FeatureCapability, SceneInspection, Vehicle3DCapabilities } from "@/configurator/types";

export function inspectScene(root: Object3D): SceneInspection {
  const meshNames: string[] = [];
  const materialNames = new Set<string>();
  let triangleCount = 0;
  let objectCount = 0;

  root.traverse((object) => {
    objectCount += 1;
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    meshNames.push(mesh.name || "(unnamed mesh)");
    const geometry = mesh.geometry;
    const indexed = geometry.getIndex();
    triangleCount += indexed ? indexed.count / 3 : geometry.getAttribute("position").count / 3;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (material?.name) materialNames.add(material.name);
    }
  });

  const size = new Vector3();
  new Box3().setFromObject(root).getSize(size);

  return {
    meshNames: [...new Set(meshNames)].sort(),
    materialNames: [...materialNames].sort(),
    triangleCount: Math.round(triangleCount),
    objectCount,
    boundingSize: [round3(size.x), round3(size.y), round3(size.z)],
  };
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function namesMatch(name: string, needles: string[]) {
  const lower = name.toLowerCase();
  return needles.some((needle) => needle && lower.includes(needle.toLowerCase()));
}

export function resolveCapabilities(
  declared: Vehicle3DCapabilities,
  inspection: SceneInspection | null,
): Vehicle3DCapabilities {
  if (!inspection) return declared;
  return {
    paint: resolveFeature(declared.paint, inspection, "material"),
    wheels: resolveFeature(declared.wheels, inspection, "mesh"),
    calipers: resolveFeature(declared.calipers, inspection, "mesh"),
    interior: resolveFeature(declared.interior, inspection, "material"),
    trim: resolveFeature(declared.trim, inspection, "material"),
  };
}

function resolveFeature(
  feature: FeatureCapability,
  inspection: SceneInspection,
  kind: "material" | "mesh",
): FeatureCapability {
  if (!feature.supported) return feature;
  const pool = kind === "material" ? inspection.materialNames : inspection.meshNames;
  const needles = kind === "material" ? feature.materialNameIncludes : feature.meshNameIncludes;
  if (needles.length === 0) {
    return {
      ...feature,
      supported: false,
      reason:
        "Capability was marked supported but no mesh/material name filters were set. Refusing to recolor unrelated parts.",
    };
  }
  const hit = pool.some((name) => namesMatch(name, needles));
  if (!hit) {
    return {
      ...feature,
      supported: false,
      reason: `No ${kind} names matched: ${needles.join(", ")}`,
    };
  }
  return feature;
}

export function applyNamedMaterialColor(
  root: Object3D,
  materialNameIncludes: string[],
  hex: string,
) {
  if (materialNameIncludes.length === 0) return;
  const exact = new Set(materialNameIncludes);
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material?.name) continue;
      const hit =
        exact.has(material.name) || namesMatch(material.name, materialNameIncludes);
      if (!hit) continue;
      const paint = material as Material & { color?: { set: (hex: string) => void } };
      if (paint.color) paint.color.set(hex);
      paint.needsUpdate = true;
    }
  });
}

export function stashOriginalColors(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const paint = material as Material & { color?: { getHex: () => number }; userData: Record<string, unknown> };
      if (!paint.color || paint.userData.formshiftOriginalColor != null) continue;
      paint.userData.formshiftOriginalColor = paint.color.getHex();
    }
  });
}

export function restoreOriginalColors(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const paint = material as Material & { color?: { setHex: (hex: number) => void }; userData: Record<string, unknown> };
      const original = paint.userData.formshiftOriginalColor;
      if (typeof original === "number" && paint.color) {
        paint.color.setHex(original);
        paint.needsUpdate = true;
      }
    }
  });
}
