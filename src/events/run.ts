import { createAdapters } from "@/events/adapters";
import { loadIntegrationConfig } from "@/events/config";
import { processOneEvent, processQueuedEvents } from "@/events/processor";
import {
  createInternalStore,
  createSupabaseEventStore,
  createSupabaseMappings,
  eventFromRow,
} from "@/events/supabase-store";
import { processTaskReminders } from "@/crm/task-reminders";
import { getEmailSiteUrl } from "@/lib/supabase/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type WorkerRunOutcome = {
  claimed: number;
  processed: number;
  error: "service_role_missing" | null;
};

function workerRuntime() {
  const admin = createAdminSupabaseClient();
  if (!admin) return null;
  const config = loadIntegrationConfig();
  const store = createSupabaseEventStore(admin);
  const adapters = createAdapters({
    config,
    mappings: createSupabaseMappings(admin),
    internal: createInternalStore(admin),
  });
  return { admin, config, store, deliver: adapters.deliver };
}

export async function runEventWorker(worker = "http-worker"): Promise<WorkerRunOutcome> {
  const runtime = workerRuntime();
  if (!runtime) return { claimed: 0, processed: 0, error: "service_role_missing" };
  const result = await processQueuedEvents({
    store: runtime.store,
    deliver: runtime.deliver,
    config: runtime.config,
    worker,
    limit: 15,
    log: (entry) => {
      console.info("[events]", entry);
    },
  });
  void processTaskReminders(runtime.admin).catch(() => {});
  return { ...result, error: null };
}

/** Process the inquiry.received event created by record_inquiry, then drain a small backlog. */
export async function runInquiryAutomation(
  eventId: string | null | undefined,
  worker = "after-inquiry",
): Promise<WorkerRunOutcome> {
  const runtime = workerRuntime();
  if (!runtime) return { claimed: 0, processed: 0, error: "service_role_missing" };

  let claimed = 0;
  let processed = 0;

  if (eventId && /^[0-9a-f-]{36}$/i.test(eventId)) {
    const { data, error } = await runtime.admin.rpc("claim_automation_event_by_id", {
      p_event_id: eventId,
      p_worker: worker,
    });
    if (error) throw error;
    if (data && typeof data === "object" && "id" in data) {
      const event = eventFromRow(data as Record<string, unknown>);
      await processOneEvent({
        store: runtime.store,
        deliver: runtime.deliver,
        config: runtime.config,
        event,
        log: (entry) => console.info("[events]", entry),
      });
      claimed += 1;
      processed += 1;
    }
  }

  const batch = await processQueuedEvents({
    store: runtime.store,
    deliver: runtime.deliver,
    config: runtime.config,
    worker: `${worker}-backlog`,
    limit: 8,
    log: (entry) => console.info("[events]", entry),
  });

  return {
    claimed: claimed + batch.claimed,
    processed: processed + batch.processed,
    error: null,
  };
}

/** Secondary wake when the first worker pass did not claim anything (serverless cold starts). */
export async function wakeEventWorkerHttp(): Promise<void> {
  const config = loadIntegrationConfig();
  const secret = config.workerSecret;
  const base = getEmailSiteUrl();
  if (!secret || !base) return;
  try {
    await fetch(`${base.replace(/\/$/, "")}/api/internal/events/process`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
  } catch {
    // best-effort; inquiry path already attempted inline processing
  }
}
