import { seedBrands, seedCatalog } from "@/catalog/seed";
import type { CatalogRepository, CatalogVehicle } from "@/catalog/types";

/**
 * Local seed-backed catalog. Swap this class for a Supabase implementation
 * that returns the same CatalogVehicle shape.
 */
export class LocalCatalogRepository implements CatalogRepository {
  async listBrands() {
    return seedBrands;
  }

  async listVehicles() {
    return seedCatalog;
  }

  async getVehicleBySlug(slug: string) {
    return seedCatalog.find((vehicle) => vehicle.slug === slug) ?? null;
  }

  async getVehiclesBySlugs(slugs: string[]) {
    const unique = [...new Set(slugs.filter(Boolean))];
    return unique
      .map((slug) => seedCatalog.find((vehicle) => vehicle.slug === slug))
      .filter((vehicle): vehicle is CatalogVehicle => Boolean(vehicle));
  }
}

export const catalogRepository: CatalogRepository = new LocalCatalogRepository();
