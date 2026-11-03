
import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export function createBrowserSupabaseClient() {
  if (!isSupabaseConfigured()) return null;

  return createBrowserClient(
    getSupabaseUrl(),
    getSupabaseAnonKey()
  );
}
