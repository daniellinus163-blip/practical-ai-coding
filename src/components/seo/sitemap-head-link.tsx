import { getPublicSiteOrigin } from "@/lib/seo/site";

/** Helps crawlers find the real XML sitemap (not the homepage `/`). */
export function SitemapHeadLink() {
  const href = `${getPublicSiteOrigin()}/sitemap.xml`;
  return <link rel="sitemap" type="application/xml" title="Sitemap" href={href} />;
}
