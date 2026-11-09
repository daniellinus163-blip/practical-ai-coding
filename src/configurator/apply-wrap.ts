import type { Material, Mesh, Object3D } from "three";
import type { MeshStandardMaterial } from "three";
import { getWrapTexture, type WrapDesignId } from "@/configurator/wrap-designs";
import { namesMatch } from "@/configurator/inspect-scene";

type PaintMaterial = MeshStandardMaterial & {
  userData: Record<string, unknown>;
  map: MeshStandardMaterial["map"];
};

export function applyBodyWrap(
  root: Object3D,
  materialNameIncludes: string[],
  wrapId: WrapDesignId,
  baseHex: string | null,
) {
  if (materialNameIncludes.length === 0) return;
  const exact = new Set(materialNameIncludes);
  const texture = getWrapTexture(wrapId);

  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material?.name) continue;
      const hit = exact.has(material.name) || namesMatch(material.name, materialNameIncludes);
      if (!hit) continue;
      const paint = material as PaintMaterial;
      if (baseHex && paint.color) paint.color.set(baseHex);

      if (!texture) {
        const originalMap = paint.userData.formshiftOriginalMap;
        if (originalMap === null) paint.map = null;
        else if (originalMap) paint.map = originalMap as PaintMaterial["map"];
        paint.roughness = typeof paint.userData.formshiftOriginalRoughness === "number" ? paint.userData.formshiftOriginalRoughness : paint.roughness;
        paint.metalness = typeof paint.userData.formshiftOriginalMetalness === "number" ? paint.userData.formshiftOriginalMetalness : paint.metalness;
      } else {
        if (paint.userData.formshiftOriginalMap === undefined) {
          paint.userData.formshiftOriginalMap = paint.map ?? null;
          paint.userData.formshiftOriginalRoughness = paint.roughness;
          paint.userData.formshiftOriginalMetalness = paint.metalness;
        }
        paint.map = texture;
        paint.roughness = wrapId === "satin-fade" ? 0.72 : 0.38;
        paint.metalness = wrapId === "honeycomb" ? 0.35 : 0.12;
      }
      paint.needsUpdate = true;
    }
  });
}

export function stashOriginalMaps(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const paint = material as Material & { map?: unknown; userData: Record<string, unknown> };
      if (paint.userData.formshiftOriginalMap !== undefined) continue;
      paint.userData.formshiftOriginalMap = paint.map ?? null;
    }
  });
}
