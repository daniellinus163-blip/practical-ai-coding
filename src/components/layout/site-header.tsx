import Link from "next/link";
import { AuthNav } from "@/components/auth/auth-nav";
import { BackButton } from "@/components/layout/back-button";
import { SiteNav } from "@/components/layout/site-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color:rgb(244_239_230_/_0.94)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton />
          <Link href="/" className="font-display text-lg tracking-wide text-[var(--ink)]">
            FormShift AI
          </Link>
        </div>
        <SiteNav />
        <div className="hidden items-center gap-4 md:flex">
          <AuthNav />
          <Link
            href="/discover"
            className="on-dark bg-[var(--ink)] px-4 py-2 text-sm hover:bg-[var(--brass)]"
          >
            Explore catalog
          </Link>
        </div>
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none text-sm text-[var(--ink)]">Menu</summary>
          <div className="absolute right-0 mt-3 w-52 border border-[var(--line)] bg-[var(--card)] p-3 shadow-lg">
            <SiteNav compact />
            <div className="border-t border-[var(--line)] pt-2">
              <AuthNav />
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
