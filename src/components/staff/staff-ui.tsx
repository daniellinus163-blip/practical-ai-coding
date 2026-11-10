import type { ReactNode } from "react";

export function StaffPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="staff-page-header mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl space-y-3">
        <h1 className="font-display text-3xl tracking-tight text-[var(--ink)] md:text-4xl">{title}</h1>
        {description ? <p className="text-sm leading-relaxed text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function StaffCard({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  return <Tag className={`staff-card ${className}`.trim()}>{children}</Tag>;
}

export function StaffTableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="staff-table-wrap mt-3 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--card)]">
      {children}
    </div>
  );
}

export function StaffEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="staff-empty rounded-xl border border-dashed border-[var(--line)] bg-[var(--card)] px-6 py-12 text-center">
      <p className="font-display text-xl text-[var(--ink)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{body}</p>
    </div>
  );
}
