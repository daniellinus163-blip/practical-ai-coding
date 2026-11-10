import type { CatalogVehicle } from "@/catalog/types";
import { paintSwatches, wheelStyles } from "@/configurator/capabilities";
import { cameraPresets } from "@/components/configurator/camera-presets";
import { wrapDesigns } from "@/configurator/wrap-designs";
import { sanitizePublicConfig, type PublicVehicleConfig } from "@/configurator/saved-config";
import { getVehicle3DAsset } from "@/configurator/manifest";

export type ConfigurationDetailRow = {
  label: string;
  value: string;
};

const paintLabel = new Map<string, string>(paintSwatches.map((s) => [s.id, s.label]));
const wheelLabel = new Map<string, string>(wheelStyles.map((s) => [s.id, s.label]));
const wrapLabel = new Map(wrapDesigns.map((s) => [s.id, s.label]));
const cameraLabel = new Map(
  Object.entries(cameraPresets).map(([id, p]) => [id, (p as { label: string }).label]),
);

function labelPaint(id: string) {
  if (id === "original") return "Factory / model default";
  return paintLabel.get(id) ?? id;
}

function labelRim(id: string) {
  if (id === "original") return "Factory wheels";
  return wheelLabel.get(id) ?? id;
}

export function configurationFromSnapshot(
  raw: unknown,
  vehicle: { id: string; slug: string } | null,
): PublicVehicleConfig | null {
  if (!vehicle || !raw || typeof raw !== "object") return null;
  return sanitizePublicConfig(raw, vehicle, getVehicle3DAsset(vehicle.slug));
}

export function buildConfigurationDetails(input: {
  snapshot: unknown;
  vehicle: CatalogVehicle | null;
  savedConfigurationName: string | null;
  savedConfigurationId: string | null;
  defaultTrimName: string | null;
}): ConfigurationDetailRow[] {
  const rows: ConfigurationDetailRow[] = [];
  const vehicle = input.vehicle;

  if (vehicle) {
    rows.push({ label: "Make", value: vehicle.brand.name });
    rows.push({ label: "Model", value: vehicle.model });
    if (vehicle.generation) rows.push({ label: "Generation", value: vehicle.generation });
  }

  const trim =
    input.savedConfigurationName?.trim() ||
    input.defaultTrimName?.trim() ||
    vehicle?.configurations.find((c) => c.isDefault)?.name ||
    null;
  if (trim) rows.push({ label: "Trim / configuration", value: trim });

  const config = vehicle ? configurationFromSnapshot(input.snapshot, vehicle) : null;
  if (!config) {
    if (input.savedConfigurationId) {
      rows.push({ label: "Saved configuration ID", value: input.savedConfigurationId });
    }
    if (input.snapshot) {
      rows.push({ label: "Studio snapshot", value: "Included (unparsed)" });
    }
    return rows;
  }

  rows.push({ label: "Exterior colour", value: labelPaint(config.paintId) });
  const wrap = wrapLabel.get(config.wrapId);
  if (config.wrapId !== "none" && wrap) rows.push({ label: "Exterior wrap / graphic", value: wrap });
  rows.push({ label: "Wheels", value: labelRim(config.rimId) });
  rows.push({ label: "Calipers", value: labelPaint(config.caliperId) });
  rows.push({
    label: "Interior view",
    value: config.viewMode === "interior" ? "Interior camera selected" : "Exterior / studio view",
  });
  const openCount = Object.values(config.openPanels).filter(Boolean).length;
  if (openCount > 0) rows.push({ label: "Open panels", value: `${openCount} panel(s) open in studio` });
  const customParts = Object.keys(config.partColors).length;
  if (customParts > 0) rows.push({ label: "Custom part colours", value: `${customParts} part override(s)` });
  rows.push({ label: "Camera", value: cameraLabel.get(config.preset) ?? config.preset });
  rows.push({ label: "Studio theme", value: config.theme });

  if (input.savedConfigurationId) {
    rows.push({ label: "Saved configuration ID", value: input.savedConfigurationId });
  }

  return rows;
}

export function formatConfigurationForHubSpot(rows: ConfigurationDetailRow[]): string | null {
  if (rows.length === 0) return null;
  return rows.map((row) => `${row.label}: ${row.value}`).join("\n");
}
