import { createAdapters } from "@/events/adapters";
import { loadIntegrationConfig } from "@/events/config";
import { processQueuedEvents } from "@/events/processor";
import { createInternalStore, createSupabaseEventStore, createSupabaseMappings } from "@/events/supabase-store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function runEventWorker(worker = "http-worker") {
  const admin = createAdminSupabaseClient();
  if (!admin) return { claimed: 0, processed: 0, error: "service_role_missing" as const };
  const config = loadIntegrationConfig();
  const store = createSupabaseEventStore(admin);
  const adapters = createAdapters({
    config,
    mappings: createSupabaseMappings(admin),
    internal: createInternalStore(admin),
  });
  const result = await processQueuedEvents({
    store,
    deliver: adapters.deliver,
    config,
    worker,
    log: (entry) => {
      console.info("[events]", entry);
    },
  });
  return { ...result, error: null };
}
