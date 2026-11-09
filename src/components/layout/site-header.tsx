import Link from "next/link";
import { AuthNav } from "@/components/auth/auth-nav";
import { BackButton } from "@/components/layout/back-button";
import { SiteMobileMenu } from "@/components/layout/site-mobile-menu";
import { SiteNav } from "@/components/layout/site-nav";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[color:rgb(244_239_230_/_0.94)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton />
          <Link href="/" className="font-display text-lg tracking-wide text-foreground">
            FormShift AI
          </Link>
        </div>
        <SiteNav />
        <div className="hidden items-center gap-4 md:flex">
          <AuthNav />
          <Link href="/discover" className={buttonVariants({ size: "lg" })}>
            Explore catalog
          </Link>
        </div>
        <SiteMobileMenu authSlot={<AuthNav />} />
      </div>
    </header>
  );
}
