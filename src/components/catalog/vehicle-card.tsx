import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "@/components/catalog/status-badge";
import { CompareToggle } from "@/components/catalog/compare-toggle";
import { bodyCopy } from "@/catalog/labels";
import type { CatalogVehicle } from "@/catalog/types";
import { photoFor } from "@/lib/editorial-media";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export function VehicleCard({
  vehicle,
  compareSlugs,
}: {
  vehicle: CatalogVehicle;
  compareSlugs: string[];
}) {
  const photo = photoFor(vehicle.slug);

  return (
    <Card className="overflow-hidden p-0 shadow-[0_12px_40px_rgba(23,21,18,0.06)] transition hover:-translate-y-0.5 hover:ring-[var(--brass)]">
      <Link href={`/cars/${vehicle.slug}`} className="relative block aspect-[16/10]">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <span className="absolute left-3 top-3">
          <StatusBadge status={vehicle.status} />
        </span>
      </Link>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {vehicle.brand.name}
          </p>
          <h2 className="font-display text-2xl">
            <Link href={`/cars/${vehicle.slug}`} className="hover:text-[var(--brass)]">
              {vehicle.model}
            </Link>
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{bodyCopy[vehicle.bodyStyle]}</p>
        <p className="line-clamp-3 text-sm">{vehicle.description}</p>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t-0 bg-transparent">
        <Link
          href={`/cars/${vehicle.slug}#studio`}
          className={buttonVariants({ size: "sm" })}
        >
          Open studio
        </Link>
        <CompareToggle slug={vehicle.slug} selected={compareSlugs} />
      </CardFooter>
    </Card>
  );
}
