import type { MetadataRoute } from "next";
import { getPublicSiteOrigin } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin();

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
