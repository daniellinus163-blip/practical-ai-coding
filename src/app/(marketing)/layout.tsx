import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<div className="h-[72px] border-b border-[var(--line)]" />}>
        <SiteHeader />
      </Suspense>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
