import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  getMetadataBase,
  GOOGLE_SITE_VERIFICATION_CODE,
  publicOpenGraph,
  publicTwitter,
  SITE_NAME,
} from "@/lib/seo/site";
import { SiteJsonLd } from "@/components/seo/site-json-ld";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

/** Allow HubSpot + Resend to finish during inquiry submit on Vercel. */
export const maxDuration = 60;

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: `${SITE_NAME} — 3D car configurator & vehicle discovery`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: publicOpenGraph(),
  twitter: publicTwitter(),
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e8e4dc",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased font-sans`}>
      <head>
        <meta name="google-site-verification" content={GOOGLE_SITE_VERIFICATION_CODE} />
        <SiteJsonLd />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-[var(--ink)]">{children}</body>
    </html>
  );
}
