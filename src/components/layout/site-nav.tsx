"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover Cars" },
  { href: "/compare", label: "Compare" },
  { href: "/my-builds", label: "My Builds" },
  { href: "/about", label: "About" },
];

export function SiteNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={compact ? "flex flex-col" : "hidden items-center gap-6 text-sm md:flex"}>
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              compact ? "block py-2 text-sm" : "",
              "hover:text-[var(--brass)]",
              active ? "font-medium text-[var(--brass)]" : "text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
