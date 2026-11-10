import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sitemap",
  robots: { index: false, follow: false },
};

/** Common mistake: / and /sitemap are not the XML sitemap. Send crawlers to sitemap.xml. */
export default function SitemapShortcutPage() {
  redirect("/sitemap.xml");
}
