import type { Metadata } from "next";
import { getSiteUrl, isLocalhostUrl } from "@/lib/supabase/env";

/** Production canonical origin for metadata, sitemap, and robots (trailing slash omitted). */
export function getPublicSiteOrigin() {
  const configured = getSiteUrl().replace(/\/$/, "");
  if (configured && !isLocalhostUrl(configured)) return configured;
  if (process.env.NODE_ENV === "production") {
    return "https://practical-ai-coding-zh1z.vercel.app";
  }
  return configured || "http://localhost:3000";
}

export function getMetadataBase(): URL {
  return new URL(`${getPublicSiteOrigin()}/`);
}

export function getGoogleSiteVerification(): string | undefined {
  const raw = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  return raw || undefined;
}

export const SITE_NAME = "FormShift AI";

export const DEFAULT_DESCRIPTION =
  "FormShift AI is an independent automotive discovery platform with an online 3D car configurator. " +
  "Explore luxury and performance vehicles, customize colours and trim in an interactive studio, " +
  "and send configuration-backed inquiries. Not an official manufacturer or dealership.";

export const DEFAULT_KEYWORDS = [
  "3D car configurator",
  "online vehicle configurator",
  "interactive car customization",
  "luxury car configurator",
  "vehicle customization platform",
  "automotive technology platform",
  "digital vehicle showroom",
  "car colour and trim customization",
];

/** Shared Open Graph / Twitter defaults for public marketing pages. */
export function publicOpenGraph(overrides?: {
  title?: string;
  description?: string;
  path?: string;
}): NonNullable<Metadata["openGraph"]> {
  const title = overrides?.title ?? `${SITE_NAME} — 3D car configurator & vehicle discovery`;
  const description = overrides?.description ?? DEFAULT_DESCRIPTION;
  const url = overrides?.path
    ? new URL(overrides.path.replace(/^\//, ""), getMetadataBase()).toString()
    : getMetadataBase().toString();

  return {
    type: "website",
    locale: "en_GB",
    url,
    siteName: SITE_NAME,
    title,
    description,
  };
}

export function publicTwitter(overrides?: {
  title?: string;
  description?: string;
}): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title: overrides?.title ?? `${SITE_NAME} — 3D car configurator`,
    description: overrides?.description ?? DEFAULT_DESCRIPTION,
  };
}
