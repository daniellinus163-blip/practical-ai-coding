import type {
  BodyStyle,
  CatalogFilters,
  CatalogSort,
  CatalogVehicle,
  VehicleStatus,
} from "@/catalog/types";

const STATUS_ORDER: VehicleStatus[] = [
  "production",
  "upcoming",
  "announced",
  "concept",
  "production_ended",
];

export function filterVehicles(
  vehicles: CatalogVehicle[],
  filters: CatalogFilters,
): CatalogVehicle[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const brand = filters.brand && filters.brand !== "all" ? filters.brand : null;
  const bodyStyle =
    filters.bodyStyle && filters.bodyStyle !== "all" ? filters.bodyStyle : null;
  const status = filters.status && filters.status !== "all" ? filters.status : null;

  return vehicles.filter((vehicle) => {
    if (brand && vehicle.brand.slug !== brand) return false;
    if (bodyStyle && vehicle.bodyStyle !== bodyStyle) return false;
    if (status && vehicle.status !== status) return false;
    if (!query) return true;
    const haystack = [
      vehicle.brand.name,
      vehicle.model,
      vehicle.statusLabel,
      vehicle.bodyStyle,
      vehicle.description,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function sortVehicles(
  vehicles: CatalogVehicle[],
  sort: CatalogSort = "name",
): CatalogVehicle[] {
  const copy = [...vehicles];
  copy.sort((a, b) => {
    switch (sort) {
      case "brand":
        return a.brand.name.localeCompare(b.brand.name) || a.model.localeCompare(b.model);
      case "status":
        return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      case "year":
        return (b.modelYear ?? 0) - (a.modelYear ?? 0);
      default:
        return `${a.brand.name} ${a.model}`.localeCompare(`${b.brand.name} ${b.model}`);
    }
  });
  return copy;
}

export function queryCatalog(
  vehicles: CatalogVehicle[],
  filters: CatalogFilters,
): CatalogVehicle[] {
  return sortVehicles(filterVehicles(vehicles, filters), filters.sort ?? "name");
}

export function uniqueBrands(vehicles: CatalogVehicle[]) {
  const map = new Map(vehicles.map((vehicle) => [vehicle.brand.slug, vehicle.brand]));
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function uniqueBodyStyles(vehicles: CatalogVehicle[]): BodyStyle[] {
  return [...new Set(vehicles.map((vehicle) => vehicle.bodyStyle))].sort();
}

export function uniqueStatuses(vehicles: CatalogVehicle[]): VehicleStatus[] {
  return [...new Set(vehicles.map((vehicle) => vehicle.status))].sort(
    (a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b),
  );
}

export interface CompareRow {
  key: string;
  label: string;
  group: string;
  cells: Array<{
    vehicleId: string;
    value: string | null;
    unit: string | null;
    confidence: string;
    notes: string | null;
  }>;
}

export function buildCompareRows(vehicles: CatalogVehicle[]): CompareRow[] {
  const keys = new Map<string, { label: string; group: string }>();
  for (const vehicle of vehicles) {
    for (const spec of vehicle.specifications) {
      if (spec.configurationId) continue;
      keys.set(spec.specKey, { label: spec.label, group: spec.group });
    }
  }
  if (keys.size === 0) {
    for (const vehicle of vehicles) {
      const defaults = vehicle.specifications.filter(
        (spec) =>
          spec.configurationId ===
          vehicle.configurations.find((configuration) => configuration.isDefault)?.id,
      );
      for (const spec of defaults) {
        keys.set(spec.specKey, { label: spec.label, group: spec.group });
      }
    }
  }

  return [...keys.entries()].map(([key, meta]) => ({
    key,
    label: meta.label,
    group: meta.group,
    cells: vehicles.map((vehicle) => {
      const spec =
        vehicle.specifications.find(
          (item) => item.specKey === key && item.configurationId === null,
        ) ??
        vehicle.specifications.find(
          (item) =>
            item.specKey === key &&
            item.configurationId ===
              vehicle.configurations.find((configuration) => configuration.isDefault)?.id,
        );
      return {
        vehicleId: vehicle.id,
        value: spec?.value ?? null,
        unit: spec?.unit ?? null,
        confidence: spec?.confidence ?? "unavailable",
        notes: spec?.notes ?? null,
      };
    }),
  }));
}

export const COMPARE_LIMIT = 3;
