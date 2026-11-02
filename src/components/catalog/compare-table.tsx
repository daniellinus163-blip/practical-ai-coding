import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "@/components/catalog/status-badge";
import { confidenceCopy } from "@/catalog/labels";
import { buildCompareRows } from "@/catalog/query";
import type { CatalogVehicle, FactConfidence } from "@/catalog/types";
import { photoFor } from "@/lib/editorial-media";

function formatCell(value: string | null, unit: string | null, confidence: string) {
  if (confidence === "unavailable" || !value) return "—";
  return unit ? `${value} ${unit}` : value;
}

export function CompareTable({ vehicles }: { vehicles: CatalogVehicle[] }) {
  const rows = buildCompareRows(vehicles);

  return (
    <div className="overflow-x-auto border border-[var(--line)] bg-[var(--card)]">
      <table className="min-w-[720px] w-full text-left text-sm md:min-w-full">
        <thead className="bg-[var(--bg-2)]">
          <tr>
            <th className="sticky left-0 z-10 w-40 bg-[var(--bg-2)] p-3 text-xs font-normal text-[var(--muted)] md:w-48 md:p-4 md:text-sm">
              Specification
            </th>
            {vehicles.map((vehicle) => {
              const photo = photoFor(vehicle.slug);
              return (
                <th key={vehicle.id} className="min-w-[200px] p-3 font-normal md:p-4">
                  <Link href={`/cars/${vehicle.slug}`} className="relative mb-3 block aspect-[16/9]">
                    <Image src={photo.src} alt={photo.alt} fill className="object-cover" sizes="320px" />
                  </Link>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    {vehicle.brand.name}
                  </p>
                  <p className="font-display text-lg">
                    <Link href={`/cars/${vehicle.slug}`}>{vehicle.model}</Link>
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={vehicle.status} />
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-[var(--line)]">
              <th className="sticky left-0 bg-[var(--card)] p-3 align-top text-xs font-normal text-[var(--muted)] md:p-4 md:text-sm">
                {row.label}
              </th>
              {row.cells.map((cell) => (
                <td key={cell.vehicleId} className="p-3 align-top md:p-4">
                  <p>{formatCell(cell.value, cell.unit, cell.confidence)}</p>
                  {cell.confidence === "unavailable" || !cell.value ? (
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      Not listed — not invented
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--brass)]">
                    {confidenceCopy[cell.confidence as FactConfidence] ?? cell.confidence}
                  </p>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
