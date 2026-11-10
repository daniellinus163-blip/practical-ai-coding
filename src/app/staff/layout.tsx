import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { StaffPageSkeleton } from "@/components/staff/staff-loading-skeleton";
import { StaffShell } from "@/components/staff/staff-shell";

export default function StaffRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="staff-crm min-h-[100dvh] w-full">
      <Suspense fallback={<StaffChromeFallback />}>
        <StaffChromeLayout>{children}</StaffChromeLayout>
      </Suspense>
    </div>
  );
}

async function StaffChromeLayout({ children }: { children: ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "/staff";
  return <StaffShell nextPath={pathname}>{children}</StaffShell>;
}

function StaffChromeFallback() {
  return (
    <div className="staff-app-main min-h-[100dvh] px-4 py-8 lg:px-10">
      <StaffPageSkeleton />
    </div>
  );
}
