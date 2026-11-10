import type { MetadataRoute } from "next";
import { catalogRepository } from "@/catalog/local-repository";
import { getRequestSiteOrigin } from "@/lib/seo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getRequestSiteOrigin();
  const now = new Date();
  const vehicles = await catalogRepository.listVehicles();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/discover`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${origin}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  const vehiclePages: MetadataRoute.Sitemap = vehicles.map((vehicle) => ({
    url: `${origin}/cars/${vehicle.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  return [...staticPages, ...vehiclePages];
}
