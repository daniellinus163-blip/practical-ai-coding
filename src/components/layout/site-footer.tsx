import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--bg-2)] px-4 py-12 text-sm text-[var(--muted)]">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
        <div className="space-y-3">
          <p className="font-display text-xl text-[var(--ink)]">FormShift AI</p>
          <p>
            Independent automotive discovery and configuration. Not an official manufacturer
            website or dealership.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]">Explore</p>
          <Link href="/discover" className="block hover:text-[var(--brass)]">
            Discover cars
          </Link>
          <Link href="/compare" className="block hover:text-[var(--brass)]">
            Compare
          </Link>
          <Link href="/about" className="block hover:text-[var(--brass)]">
            About
          </Link>
        </div>
        <p>
          Submitting an inquiry does not order a vehicle. Manufacturer names remain their owners’
          trademarks. Editorial photographs are from Unsplash and are not official product shots.
        </p>
      </div>
    </footer>
  );
}
