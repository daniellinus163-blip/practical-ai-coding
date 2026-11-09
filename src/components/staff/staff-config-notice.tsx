import { getSupabaseServerConfigStatus } from "@/lib/supabase/server-config-status";
import { EmptyState } from "@/components/catalog/empty-state";

export function StaffConfigNotice() {
  const status = getSupabaseServerConfigStatus();
  if (status.crmReady) return null;

  return (
    <EmptyState
      title="CRM server configuration incomplete"
      body={
        "This deployment is missing environment variables the staff CRM needs. " +
        "On Vercel → Settings → Environment Variables → enable for Production, then Redeploy (not only Save). " +
        `Missing on this server: ${status.missing.join(", ") || "unknown"}. ` +
        "Set all three for the same Supabase project: URL, anon/publishable key, and service_role key (never NEXT_PUBLIC_ on the service role)."
      }
    />
  );
}
