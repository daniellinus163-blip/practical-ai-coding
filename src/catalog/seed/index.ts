import { brands } from "@/catalog/seed/brands";
import { astonMartinValkyrie } from "@/catalog/seed/aston-martin-valkyrie";
import { bugattiChiron } from "@/catalog/seed/bugatti-chiron";
import { ferrariSp38 } from "@/catalog/seed/ferrari-sp38";
import { koenigseggJeskoAbsolut } from "@/catalog/seed/koenigsegg-jesko-absolut";
import { lamborghiniRevuelto } from "@/catalog/seed/lamborghini-revuelto";
import { mclarenSenna } from "@/catalog/seed/mclaren-senna";
import { mercedesAmgOne } from "@/catalog/seed/mercedes-amg-one";
import { mercedesMaybachGls600 } from "@/catalog/seed/mercedes-maybach-gls-600";
import { mercedesMaybachSClass } from "@/catalog/seed/mercedes-maybach-s-class";
import { paganiHuayra } from "@/catalog/seed/pagani-huayra";
import { porsche911Gt3 } from "@/catalog/seed/porsche-911-gt3";
import { teslaModel3 } from "@/catalog/seed/tesla-model-3";
import { teslaRoadster } from "@/catalog/seed/tesla-roadster";
import type { Brand, CatalogVehicle, Vehicle } from "@/catalog/types";

export const seedBrands: Brand[] = brands;

export const seedVehicles: Vehicle[] = [
  teslaModel3,
  teslaRoadster,
  bugattiChiron,
  lamborghiniRevuelto,
  porsche911Gt3,
  mclarenSenna,
  ferrariSp38,
  koenigseggJeskoAbsolut,
  paganiHuayra,
  astonMartinValkyrie,
  mercedesAmgOne,
  mercedesMaybachSClass,
  mercedesMaybachGls600,
];

export function withBrand(vehicle: Vehicle): CatalogVehicle {
  const brand = seedBrands.find((item) => item.id === vehicle.brandId);
  if (!brand) {
    throw new Error(`Missing brand ${vehicle.brandId} for vehicle ${vehicle.slug}`);
  }
  return { ...vehicle, brand };
}

export const seedCatalog: CatalogVehicle[] = seedVehicles.map(withBrand);
