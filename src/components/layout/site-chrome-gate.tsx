import { headers } from "next/headers";
import type { ReactNode } from "react";

/** Hides marketing header/footer on staff CRM routes (server-side, no overlap with command layout). */
export async function SiteChromeGate({ children }: { children: ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname.startsWith("/staff")) return null;
  return <>{children}</>;
}
