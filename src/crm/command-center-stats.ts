import type { SupabaseClient } from "@supabase/supabase-js";
import { PIPELINE_STAGES } from "@/crm/stages";

export type CommandCenterStats = {
  totalLeads: number;
  openTasks: number;
  overdueTasks: number;
  inquiriesLast7Days: number;
  stageCounts: Record<string, number>;
  queuedEvents: number;
  processingEvents: number;
  failedEvents: number;
  followUpsDue: number;
  followUpsWaiting: number;
  lastSucceededEventAt: string | null;
};

export async function loadCommandCenterStats(admin: SupabaseClient): Promise<CommandCenterStats> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const [
    stageCounts,
    total,
    openTasks,
    overdue,
    recentInquiries,
    queued,
    processing,
    failed,
    followUpsDue,
    followUpsWaiting,
    lastSuccess,
  ] = await Promise.all([
    Promise.all(
      PIPELINE_STAGES.map(async (stage) => {
        const { count } = await admin.from("leads").select("id", { count: "exact", head: true }).eq("status", stage);
        return { stage, count: count ?? 0 };
      }),
    ),
    admin.from("leads").select("id", { count: "exact", head: true }),
    admin.from("lead_tasks").select("id", { count: "exact", head: true }).is("completed_at", null),
    admin
      .from("lead_tasks")
      .select("id", { count: "exact", head: true })
      .is("completed_at", null)
      .lt("due_at", nowIso),
    admin.from("inquiries").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    admin.from("automation_events").select("id", { count: "exact", head: true }).eq("status", "queued"),
    admin.from("automation_events").select("id", { count: "exact", head: true }).eq("status", "processing"),
    admin
      .from("automation_events")
      .select("id", { count: "exact", head: true })
      .in("status", ["failed", "dead"]),
    admin
      .from("automation_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "follow_up.reminder")
      .in("status", ["queued", "failed"])
      .lte("next_attempt_at", nowIso),
    admin
      .from("automation_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "follow_up.reminder")
      .in("status", ["queued", "failed"])
      .gt("next_attempt_at", nowIso),
    admin
      .from("automation_events")
      .select("completed_at")
      .eq("status", "succeeded")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const stageMap: Record<string, number> = {};
  for (const row of stageCounts) stageMap[row.stage] = row.count;

  return {
    totalLeads: total.count ?? 0,
    openTasks: openTasks.count ?? 0,
    overdueTasks: overdue.count ?? 0,
    inquiriesLast7Days: recentInquiries.count ?? 0,
    stageCounts: stageMap,
    queuedEvents: queued.count ?? 0,
    processingEvents: processing.count ?? 0,
    failedEvents: failed.count ?? 0,
    followUpsDue: followUpsDue.count ?? 0,
    followUpsWaiting: followUpsWaiting.count ?? 0,
    lastSucceededEventAt: lastSuccess.data?.completed_at ?? null,
  };
}
