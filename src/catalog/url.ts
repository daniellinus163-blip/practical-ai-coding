import type { BodyStyle, CatalogFilters, CatalogSort, VehicleStatus } from "@/catalog/types";

const bodyStyles: BodyStyle[] = ["sedan", "coupe", "roadster", "targa", "suv"];
const statuses: VehicleStatus[] = [
  "production",
  "upcoming",
  "announced",
  "concept",
  "production_ended",
];
const sorts: CatalogSort[] = ["name", "brand", "status", "year"];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCompareParam(value: string | string[] | undefined) {
  const raw = first(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseCatalogFilters(
  searchParams: Record<string, string | string[] | undefined>,
): CatalogFilters {
  const body = first(searchParams.body);
  const status = first(searchParams.status);
  const sort = first(searchParams.sort);

  return {
    query: first(searchParams.q) ?? "",
    brand: first(searchParams.brand) ?? "all",
    bodyStyle: bodyStyles.includes(body as BodyStyle) ? (body as BodyStyle) : "all",
    status: statuses.includes(status as VehicleStatus) ? (status as VehicleStatus) : "all",
    sort: sorts.includes(sort as CatalogSort) ? (sort as CatalogSort) : "name",
  };
}
