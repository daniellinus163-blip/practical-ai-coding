import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { AvatarMark } from "@/components/account/avatar-mark";
import { cn } from "@/lib/utils";

const links = [
  { href: "/account", label: "Overview", match: "exact" as const },
  { href: "/account/profile", label: "Profile", match: "prefix" as const },
  { href: "/my-builds", label: "Builds", match: "prefix" as const },
  { href: "/account/inquiries", label: "Inquiries", match: "prefix" as const },
];

export function AccountShell({
  children,
  currentPath,
  displayName,
  email,
  avatarUrl,
  staffHref,
  inquiryUnreadCount = 0,
}: {
  children: React.ReactNode;
  currentPath: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  staffHref?: string | null;
  inquiryUnreadCount?: number;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <AvatarMark name={displayName} email={email} src={avatarUrl} size={56} />
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Account</p>
            <h1 className="font-display text-3xl text-[var(--ink)] sm:text-4xl">
              {displayName || "Your profile"}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{email}</p>
          </div>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="border border-[var(--line)] px-4 py-2 text-sm">
            Sign out
          </button>
        </form>
      </div>

      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {links.map((link) => {
            const active =
              link.match === "exact" ? currentPath === link.href : currentPath.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap border px-3 py-2 text-sm",
                  active
                    ? "on-dark border-[var(--ink)] bg-[var(--ink)]"
                    : "border-[var(--line)] bg-[var(--card)] text-[var(--ink)] hover:border-[var(--brass)]",
                )}
              >
                {link.label}
                {link.href === "/account/inquiries" && inquiryUnreadCount > 0 ? (
                  <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] text-white">
                    {inquiryUnreadCount > 9 ? "9+" : inquiryUnreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
          {staffHref ? (
            <Link
              href={staffHref}
              className="whitespace-nowrap border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm"
            >
              Staff CRM
            </Link>
          ) : null}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
