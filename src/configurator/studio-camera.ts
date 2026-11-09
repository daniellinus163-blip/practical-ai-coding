import { Box3, Vector3 } from "three";

export type StudioViewMode = "exterior" | "interior";

export type StudioCameraFrame = {
  position: [number, number, number];
  target: [number, number, number];
};

/** Driver-seat orbit anchor from the fitted model bounds (works for every normalized GLB). */
export function interiorCameraFromBounds(box: Box3): StudioCameraFrame {
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const eyeY = center.y + size.y * 0.2;
  const eyeX = center.x + size.x * 0.08;
  const eyeZ = center.z - size.z * 0.08;
  const target = new Vector3(center.x, center.y + size.y * 0.28, center.z + size.z * 0.22);
  return {
    position: [eyeX, eyeY, eyeZ],
    target: [target.x, target.y, target.z],
  };
}

export const exteriorPresetIds = [
  "threeQuarter",
  "front",
  "side",
  "rear",
  "top",
] as const;

export type ExteriorPresetId = (typeof exteriorPresetIds)[number];
