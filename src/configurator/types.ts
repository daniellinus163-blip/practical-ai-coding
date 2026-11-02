export type AssetPresence = "not_supplied" | "supplied";

export type FeatureKind = "paint" | "wheels" | "calipers" | "interior" | "trim";

export interface FeatureCapability {
  supported: boolean;
  reason: string;
  /** Only materials whose names include one of these strings may be recolored. */
  materialNameIncludes: string[];
  /** Only meshes whose names include one of these strings may be swapped or hidden. */
  meshNameIncludes: string[];
}

export interface Vehicle3DCapabilities {
  paint: FeatureCapability;
  wheels: FeatureCapability;
  calipers: FeatureCapability;
  interior: FeatureCapability;
  trim: FeatureCapability;
}

export interface Vehicle3DAsset {
  vehicleSlug: string;
  displayName: string;
  /** Expected drop path under /public */
  relativeFile: string;
  publicUrl: string;
  preferredFormat: "glb" | "gltf";
  officialProductionModel: boolean;
  upcomingVehicle: boolean;
  licenceStatus: "unchecked_until_file_supplied" | "recorded";
  licenceName: string | null;
  licenceUrl: string | null;
  author: string | null;
  sourceUrl: string | null;
  attributionRequired: boolean | null;
  commercialUseAllowed: boolean | null;
  redistributionAllowed: boolean | null;
  notes: string;
  capabilities: Vehicle3DCapabilities;
}

export interface SceneInspection {
  meshNames: string[];
  materialNames: string[];
  triangleCount: number;
  objectCount: number;
  boundingSize: [number, number, number];
}
