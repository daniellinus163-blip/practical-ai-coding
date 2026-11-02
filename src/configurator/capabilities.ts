import type { FeatureCapability, Vehicle3DCapabilities } from "@/configurator/types";

const unsupported = (reason: string): FeatureCapability => ({
  supported: false,
  reason,
  materialNameIncludes: [],
  meshNameIncludes: [],
});

export const awaitingAssetCapabilities: Vehicle3DCapabilities = {
  paint: unsupported("No licensed GLB has been supplied for this vehicle yet."),
  wheels: unsupported("Wheel styles need separate wheel meshes on a licensed model."),
  calipers: unsupported("Caliper colour needs separate caliper meshes."),
  interior: unsupported("Interior colour needs interior meshes."),
  trim: unsupported("Trim changes need distinct trim materials."),
};

/** Capabilities of the original FormShift stand-in geometry (not a manufacturer model). */
export const standInCapabilities: Vehicle3DCapabilities = {
  paint: {
    supported: true,
    reason: "Recolors the BodyPaint material on the temporary studio stand-in.",
    materialNameIncludes: ["BodyPaint"],
    meshNameIncludes: ["Body"],
  },
  wheels: {
    supported: true,
    reason: "Switches between Spoke and Disc wheel groups on the stand-in.",
    materialNameIncludes: ["WheelPaint"],
    meshNameIncludes: ["WheelSpoke", "WheelDisc"],
  },
  calipers: unsupported("The stand-in has no separate caliper meshes."),
  interior: unsupported("The stand-in cabin is a single dark glass/cabin mass, not a recolorable interior."),
  trim: unsupported("The stand-in has no separate trim materials."),
};

export const paintSwatches = [
  { id: "obsidian", label: "Obsidian", hex: "#1a1a1a" },
  { id: "ivory", label: "Ivory", hex: "#e7dfd0" },
  { id: "pearl", label: "Pearl", hex: "#f4f1ea" },
  { id: "silver", label: "Silver", hex: "#c5c8cc" },
  { id: "graphite", label: "Graphite", hex: "#5c6168" },
  { id: "brass", label: "Brass", hex: "#b08a4a" },
  { id: "midnight", label: "Midnight", hex: "#1e3a5f" },
  { id: "electric", label: "Electric", hex: "#3b6ea8" },
  { id: "oxblood", label: "Oxblood", hex: "#7a1f24" },
  { id: "racing", label: "Racing green", hex: "#1f4d3a" },
  { id: "orange", label: "Arancio", hex: "#d4551a" },
] as const;

export const wheelStyles = [
  { id: "spoke", label: "Spoke" },
  { id: "disc", label: "Disc" },
] as const;

export type WheelStyleId = (typeof wheelStyles)[number]["id"];
