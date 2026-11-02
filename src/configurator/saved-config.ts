import { cameraPresets, type CameraPresetId } from "@/components/configurator/camera-presets";
import { paintSwatches } from "@/configurator/capabilities";
import type { Vehicle3DAsset } from "@/configurator/types";

export type StudioThemeId = "studio" | "dusk" | "showroom";

export const CONFIG_SCHEMA_VERSION = 1;

const HEX = /^#[0-9a-fA-F]{6}$/;
const themes = new Set<StudioThemeId>(["studio", "dusk", "showroom"]);
const cameras = new Set<string>(Object.keys(cameraPresets));
const paintIds = new Set<string>(["original", ...paintSwatches.map((item) => item.id)]);

export type PublicVehicleConfig = {
  schemaVersion: number;
  vehicleId: string;
  vehicleSlug: string;
  paintId: string;
  caliperId: string;
  rimId: string;
  preset: CameraPresetId;
  theme: StudioThemeId;
  partColors: Record<string, string>;
  openPanels: Record<string, boolean>;
};

export function emptyPublicConfig(vehicleId: string, vehicleSlug: string): PublicVehicleConfig {
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    vehicleId,
    vehicleSlug,
    paintId: "original",
    caliperId: "original",
    rimId: "original",
    preset: "threeQuarter",
    theme: "studio",
    partColors: {},
    openPanels: {},
  };
}

function cleanHexMap(input: unknown, allowedPartIds?: Set<string>) {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof key !== "string" || key.length > 120) continue;
    if (allowedPartIds && !allowedPartIds.has(key)) continue;
    if (typeof value !== "string" || !HEX.test(value)) continue;
    out[key] = value.toLowerCase();
  }
  return out;
}

function cleanPanelMap(input: unknown) {
  const out: Record<string, boolean> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof key !== "string" || key.length > 120) continue;
    if (typeof value !== "boolean") continue;
    out[key] = value;
  }
  return out;
}

export function sanitizePublicConfig(
  raw: unknown,
  vehicle: { id: string; slug: string },
  asset: Vehicle3DAsset | null,
  allowedPartIds?: Set<string>,
): PublicVehicleConfig {
  const base = emptyPublicConfig(vehicle.id, vehicle.slug);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const data = raw as Record<string, unknown>;

  const paintId = typeof data.paintId === "string" && paintIds.has(data.paintId) ? data.paintId : "original";
  const caliperId =
    typeof data.caliperId === "string" && paintIds.has(data.caliperId) ? data.caliperId : "original";
  const rimId = typeof data.rimId === "string" && paintIds.has(data.rimId) ? data.rimId : "original";
  const preset =
    typeof data.preset === "string" && cameras.has(data.preset) ? (data.preset as CameraPresetId) : "threeQuarter";
  const theme =
    typeof data.theme === "string" && themes.has(data.theme as StudioThemeId)
      ? (data.theme as StudioThemeId)
      : "studio";

  const paintSupported = asset?.capabilities.paint.supported ?? true;
  const caliperSupported = asset?.capabilities.calipers.supported ?? false;
  const rimSupported = asset?.capabilities.wheels.supported ?? false;

  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    vehicleId: vehicle.id,
    vehicleSlug: vehicle.slug,
    paintId: paintSupported ? paintId : "original",
    caliperId: caliperSupported ? caliperId : "original",
    rimId: rimSupported ? rimId : "original",
    preset,
    theme,
    partColors: paintSupported ? cleanHexMap(data.partColors, allowedPartIds) : {},
    openPanels: cleanPanelMap(data.openPanels),
  };
}

function toBase64Url(text: string) {
  if (typeof Buffer !== "undefined") return Buffer.from(text, "utf8").toString("base64url");
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  if (typeof Buffer !== "undefined") return Buffer.from(value, "base64url").toString("utf8");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeShareParam(config: PublicVehicleConfig) {
  const publicOnly = {
    v: CONFIG_SCHEMA_VERSION,
    s: config.vehicleSlug,
    p: config.paintId,
    c: config.caliperId,
    r: config.rimId,
    cam: config.preset,
    t: config.theme,
    pc: config.partColors,
    op: config.openPanels,
  };
  return toBase64Url(JSON.stringify(publicOnly));
}

export function decodeShareParam(value: string | null | undefined): unknown | null {
  if (!value) return null;
  try {
    return JSON.parse(fromBase64Url(value)) as unknown;
  } catch {
    return null;
  }
}

export function expandSharePayload(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const data = raw as Record<string, unknown>;
  if ("paintId" in data) return raw;
  return {
    schemaVersion: data.v,
    vehicleSlug: data.s,
    paintId: data.p,
    caliperId: data.c,
    rimId: data.r,
    preset: data.cam,
    theme: data.t,
    partColors: data.pc,
    openPanels: data.op,
  };
}

export function liveConfigKey(slug: string) {
  return `formshift-live-config:${slug}`;
}
