"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { SiteNav } from "@/components/layout/site-nav";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function SiteMobileMenu({ authSlot }: { authSlot: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="md:hidden">
            <Menu className="size-4" />
            Menu
          </Button>
        }
      />
      <SheetContent side="right" className="w-[min(100%,20rem)]">
        <SheetHeader>
          <SheetTitle className="font-display text-left">FormShift AI</SheetTitle>
        </SheetHeader>
        <SiteNav compact />
        <Separator />
        {authSlot}
        <Link href="/discover" className={buttonVariants({ className: "w-full" })}>
          Explore catalog
        </Link>
      </SheetContent>
    </Sheet>
  );
}
