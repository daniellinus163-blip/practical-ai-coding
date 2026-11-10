import { getPublicSiteOrigin, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

/** Structured data for search engines and AI crawlers (JSON-LD). */
export function SiteJsonLd() {
  const origin = getPublicSiteOrigin();

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: origin,
    description: DEFAULT_DESCRIPTION,
    areaServed: "Worldwide",
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: origin,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "en-GB",
    publisher: { "@type": "Organization", name: SITE_NAME, url: origin },
  };

  const webApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: origin,
    applicationCategory: "AutomotiveApplication",
    operatingSystem: "Web browser",
    description:
      "Online 3D vehicle configurator with inquiry management, lead tracking, and sales automation for automotive teams.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Public catalog and studio access; staff CRM requires authorised login.",
    },
    areaServed: {
      "@type": "Place",
      name: "Worldwide",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webApp) }} />
    </>
  );
}
