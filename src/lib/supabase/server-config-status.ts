import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isServiceRoleConfigured,
} from "@/lib/supabase/env";

export type SupabaseServerConfigStatus = {
  hasUrl: boolean;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  crmReady: boolean;
  missing: string[];
};

export function getSupabaseServerConfigStatus(): SupabaseServerConfigStatus {
  const hasUrl = Boolean(getSupabaseUrl());
  const hasAnonKey = Boolean(getSupabaseAnonKey());
  const hasServiceRoleKey = Boolean(getSupabaseServiceRoleKey());
  const missing: string[] = [];
  if (!hasUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!hasAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)");
  if (!hasServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return {
    hasUrl,
    hasAnonKey,
    hasServiceRoleKey,
    crmReady: isServiceRoleConfigured(),
    missing,
  };
}
