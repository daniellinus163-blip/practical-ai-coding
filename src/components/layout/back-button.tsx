"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const CURR_KEY = "formshift-curr-path";
const PREV_KEY = "formshift-prev-path";

function fallbackFor(pathname: string) {
  if (pathname.startsWith("/cars/") || pathname === "/compare") return "/discover";
  if (pathname.startsWith("/account") || pathname.startsWith("/my-builds") || pathname.startsWith("/login")) {
    return "/";
  }
  return "/";
}

export function BackButton({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const current = `${pathname}${window.location.search}`;
    const last = sessionStorage.getItem(CURR_KEY);
    if (last && last !== current) {
      sessionStorage.setItem(PREV_KEY, last);
    }
    sessionStorage.setItem(CURR_KEY, current);
  }, [pathname]);

  if (pathname === "/") return null;

  function goBack() {
    const previous = sessionStorage.getItem(PREV_KEY);
    if (previous && previous !== `${pathname}${window.location.search}`) {
      router.back();
      return;
    }
    router.push(fallbackFor(pathname));
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-sm text-[var(--ink)] hover:text-[var(--brass)]",
        className,
      )}
      aria-label="Go back to the previous page"
    >
      <span aria-hidden="true">←</span>
      Back
    </button>
  );
}
