import Link from "next/link";
import { requireStaff } from "@/crm/guard";
import { StaffConfigNotice } from "@/components/staff/staff-config-notice";

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
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Command Center · {staff.role}</p>
          <h1 className="font-display text-3xl text-[var(--ink)] md:text-4xl">FormShift AI CRM</h1>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link className="underline" href="/staff">
            Command Center
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
      {!staff.serviceRole ? <StaffConfigNotice /> : null}
      {children}
    </div>
  );
}
