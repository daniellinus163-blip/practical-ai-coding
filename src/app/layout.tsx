import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased font-sans`}>
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-[var(--ink)]">{children}</body>
    </html>
  );
}
