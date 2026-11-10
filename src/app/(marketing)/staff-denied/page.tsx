import Link from "next/link";

export const metadata = { title: "Not authorised", robots: { index: false, follow: false } };

export default function StaffDeniedPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-16">
      <h1 className="font-display text-4xl text-[var(--ink)]">Not authorised</h1>
      <p className="text-[var(--muted)]">
        This area is only for people listed in <code>staff_members</code>. A customer account cannot
        open internal leads, notes, or pipeline records. An administrator must insert your user id
        with SQL — FormShift never creates a default admin.
      </p>
      <p>
        <Link href="/" className="underline">
          Back to the catalog
        </Link>
      </p>
    </div>
  );
}
