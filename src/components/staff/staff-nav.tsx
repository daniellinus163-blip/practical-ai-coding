"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  CalendarClock,
  Car,
  Kanban,
  LayoutDashboard,
  Menu,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/staff", label: "Command center", icon: LayoutDashboard, match: (p: string) => p === "/staff" },
  { href: "/staff/leads", label: "Leads", icon: Users, match: (p: string) => p.startsWith("/staff/leads") },
  { href: "/staff/pipeline", label: "Pipeline", icon: Kanban, match: (p: string) => p === "/staff/pipeline" },
  { href: "/staff/follow-ups", label: "Follow-ups", icon: CalendarClock, match: (p: string) => p.startsWith("/staff/follow-ups") },
  { href: "/staff/events", label: "Monitoring", icon: Activity, match: (p: string) => p.startsWith("/staff/events") },
  { href: "/staff/notifications", label: "Notifications", icon: Bell, match: (p: string) => p.startsWith("/staff/notifications") },
  { href: "/discover", label: "Vehicle catalog", icon: Car, match: () => false, external: true },
] as const;

export function StaffNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";

  return (
    <ul className="space-y-1.5" role="list">
      {NAV.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        const className = `staff-nav-link flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors duration-200 ${
          active ? "staff-nav-link-active" : ""
        }`;
        const inner = (
          <>
            <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
            <span>{item.label}</span>
          </>
        );
        if ("external" in item && item.external) {
          return (
            <li key={item.href}>
              <a href={item.href} className={className} onClick={onNavigate}>
                {inner}
              </a>
            </li>
          );
        }
        return (
          <li key={item.href}>
            <Link href={item.href} className={className} onClick={onNavigate} aria-current={active ? "page" : undefined}>
              {inner}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function StaffMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="lg:hidden" aria-label="Open staff navigation">
            <Menu className="size-4" />
            Menu
          </Button>
        }
      />
      <SheetContent side="left" className="staff-sidebar w-[min(100%,18rem)] border-r p-0">
        <SheetHeader className="border-b border-[var(--staff-sidebar-line)] px-4 py-4 text-left">
          <SheetTitle className="font-display text-lg text-[var(--staff-sidebar-text)]">FormShift CRM</SheetTitle>
        </SheetHeader>
        <nav className="p-3" aria-label="Staff">
          <StaffNavList onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
