import type { Metadata } from "next";
import { headers } from "next/headers";
import { getSiteUrl, isLocalhostUrl } from "@/lib/supabase/env";

const PRODUCTION_FALLBACK_ORIGIN = "https://practical-ai-coding-zh1z.vercel.app";

/** Configured canonical origin (trailing slash omitted). */
export function getPublicSiteOrigin() {
  const configured = getSiteUrl().replace(/\/$/, "");
  if (configured && !isLocalhostUrl(configured)) return configured;
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_FALLBACK_ORIGIN;
  }
  return configured || "http://localhost:3000";
}

/** Prefer the live request host so sitemap/robots match the Search Console property URL. */
export async function getRequestSiteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host");
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (host && !host.includes("localhost") && !host.startsWith("127.0.0.1")) {
    return `${proto}://${host}`;
  }
  return getPublicSiteOrigin();
}

export function getMetadataBase(): URL {
  return new URL(`${getPublicSiteOrigin()}/`);
}

/** Public HTML-tag token from Google Search Console (visible in page source after deploy). */
export const GOOGLE_SITE_VERIFICATION_CODE = "CrjjGb7zXqJXIsvcK70HtFqRBAOVLfrrsi4Hb1ycdCA";

export function getGoogleSiteVerification(): string {
  return process.env.GOOGLE_SITE_VERIFICATION?.trim() || GOOGLE_SITE_VERIFICATION_CODE;
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
