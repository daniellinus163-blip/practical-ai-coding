import Link from "next/link";
import { requireStaff } from "@/crm/guard";
import { EmptyState } from "@/components/catalog/empty-state";

export async function StaffShell({
  children,
  nextPath,
}: {
  children: React.ReactNode;
  nextPath: string;
}) {
  const staff = await requireStaff(nextPath);
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Internal CRM · {staff.role}</p>
          <h1 className="font-display text-3xl text-[var(--ink)] md:text-4xl">FormShift staff</h1>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link className="underline" href="/staff">
            Overview
          </Link>
          <Link className="underline" href="/staff/leads">
            Leads
          </Link>
          <Link className="underline" href="/staff/pipeline">
            Pipeline
          </Link>
          <Link className="underline" href="/staff/events">
            Integrations
          </Link>
          <Link className="underline" href="/discover">
            Catalog
          </Link>
        </nav>
      </header>
      {!staff.serviceRole ? (
        <EmptyState
          title="Service role key missing"
          body="CRM records stay on the server. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (never NEXT_PUBLIC_) and restart. Roles are still checked against staff_members."
        />
      ) : null}
      {children}
    </div>
  );
}
