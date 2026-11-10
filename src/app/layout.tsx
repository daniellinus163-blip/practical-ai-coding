import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, Outfit } from "next/font/google";
import { SiteChromeGate } from "@/components/layout/site-chrome-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
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
  title: {
    default: "FormShift AI",
    template: "%s · FormShift AI",
  },
  description:
    "Independent automotive discovery and 3D configuration. Not an official manufacturer website or dealership.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased font-sans`}>
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-[var(--ink)]">
        <SiteChromeGate>
          <Suspense fallback={<div className="h-[72px] border-b border-[var(--line)]" />}>
            <SiteHeader />
          </Suspense>
        </SiteChromeGate>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        <SiteChromeGate>
          <SiteFooter />
        </SiteChromeGate>
      </body>
    </html>
  );
}
