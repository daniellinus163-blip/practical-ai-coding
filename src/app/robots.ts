import type { MetadataRoute } from "next";
import { getRequestSiteOrigin } from "@/lib/seo/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getRequestSiteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/staff",
          "/staff/",
          "/account",
          "/account/",
          "/login",
          "/register",
          "/forgot-password",
          "/auth/",
          "/my-builds",
          "/inquiries/",
          "/staff-denied",
          "/api/",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
