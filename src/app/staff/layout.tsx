import { headers } from "next/headers";
import type { ReactNode } from "react";
import { StaffShell } from "@/components/staff/staff-shell";

export default async function StaffRootLayout({ children }: { children: ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "/staff";
  return (
    <div className="staff-crm min-h-[100dvh] w-full">
      <StaffShell nextPath={pathname}>{children}</StaffShell>
    </div>
  );
}
