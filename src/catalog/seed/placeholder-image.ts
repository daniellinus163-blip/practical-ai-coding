import type { VehicleImage } from "@/catalog/types";

export function placeholderImage(
  vehicleId: string,
  modelName: string,
): VehicleImage {
  return {
    id: `${vehicleId}-img-placeholder`,
    vehicleId,
    role: "placeholder",
    src: null,
    alt: `${modelName} visual placeholder. Official manufacturer photography is not used.`,
    isPlaceholder: true,
    rightsNote:
      "Placeholder graphic only. Manufacturer trademarks and imagery remain subject to their respective rights. Do not treat this as official product photography.",
  };
}
