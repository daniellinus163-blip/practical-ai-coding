import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl">Page not found</h1>
      <p className="mt-3 text-[var(--muted)]">That route is not part of the catalog.</p>
      <Link href="/discover" className="mt-6 inline-block text-[var(--brass)]">
        Discover cars
      </Link>
    </div>
  );
}
