import { isSupabaseConfigured } from "@/lib/supabase/env";

export function SetupNotice() {
  if (isSupabaseConfigured()) return null;
  return (
    <div className="border border-[var(--accent)] bg-[var(--card)] p-4 text-sm text-[var(--ink)]">
      Accounts are not live yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, run the SQL in{" "}
      <code>supabase/migrations/20261028_formshift_phase4.sql</code>, then restart the app. See{" "}
      <code>supabase/SETUP.md</code>.
    </div>
  );
}
