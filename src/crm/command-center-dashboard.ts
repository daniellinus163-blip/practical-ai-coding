import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bucketCountsByUtcDay,
  countBySlug,
  formatDurationMs,
  lastUtcDayKeys,
  medianFirstResponseMs,
  type DayCount,
  type SlugCount,
} from "@/crm/command-center-buckets";
import { loadCommandCenterStats, type CommandCenterStats } from "@/crm/command-center-stats";
import { PIPELINE_STAGES, STAGE_LABELS, type PipelineStage } from "@/crm/stages";

const INQUIRY_CHART_DAYS = 14;
const FIRST_RESPONSE_SCAN_LIMIT = 400;

export type RecentInquiryRow = {
  id: string;
  name: string;
  email: string;
  vehicleSlug: string | null;
  createdAt: string;
  leadId: string | null;
};

export type RecentStaffActivityRow = {
  id: string;
  leadId: string;
  kind: string;
  bodyPreview: string | null;
  createdAt: string;
  actorLabel: string;
};

export type UpcomingFollowUpRow = {
  id: string;
  leadId: string;
  title: string;
  dueAt: string;
  leadName: string | null;
  leadEmail: string;
};

export type CommandCenterDashboard = {
  stats: CommandCenterStats;
  kpis: {
    totalInquiries: number;
    inquiriesToday: number;
    leadsAwaitingResponse: number;
    qualifiedLeads: number;
    wonDeals: number;
    overdueFollowUps: number;
    failedIntegrations: number;
    avgFirstResponseLabel: string | null;
    avgFirstResponseSampleSize: number;
  };
  inquiryActivity: DayCount[];
  pipelineStages: Array<{ stage: PipelineStage; label: string; count: number }>;
  popularVehicles: SlugCount[];
  recentInquiries: RecentInquiryRow[];
  recentStaffActivity: RecentStaffActivityRow[];
  upcomingFollowUps: UpcomingFollowUpRow[];
};

function normalizeLeadId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) return normalizeLeadId(value[0]);
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" ? row.id : null;
}

function activityPreview(body: string | null, kind: string): string | null {
  if (body?.trim()) return body.trim().slice(0, 120);
  return kind.replaceAll("_", " ");
}

const STAFF_ACTIVITY_KINDS_HIDE = new Set(["inquiry_received"]);

export async function loadCommandCenterDashboard(admin: SupabaseClient): Promise<CommandCenterDashboard> {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const chartStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (INQUIRY_CHART_DAYS - 1)),
  ).toISOString();
  const dayKeys = lastUtcDayKeys(INQUIRY_CHART_DAYS, now);
  const nowIso = now.toISOString();

  const stats = await loadCommandCenterStats(admin);

  const [
    totalInquiries,
    inquiriesToday,
    awaitingResponse,
    qualified,
    won,
    overdueFollowUps,
    inquiryTimestamps,
    vehicleRows,
    recentInquiryRows,
    recentActivities,
    upcomingTasks,
    staffReplies,
  ] = await Promise.all([
    admin.from("inquiries").select("id", { count: "exact", head: true }),
    admin.from("inquiries").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "qualified"),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "won"),
    admin
      .from("lead_tasks")
      .select("id", { count: "exact", head: true })
      .is("completed_at", null)
      .lt("due_at", nowIso),
    admin.from("inquiries").select("created_at").gte("created_at", chartStart),
    admin.from("inquiries").select("vehicle_slug"),
    admin
      .from("inquiries")
      .select("id, name, email, vehicle_slug, created_at, leads ( id )")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("lead_activities")
      .select("id, lead_id, kind, body, created_at, actor_user_id")
      .not("actor_user_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("lead_tasks")
      .select("id, lead_id, title, due_at, leads ( name, email )")
      .is("completed_at", null)
      .gte("due_at", nowIso)
      .order("due_at", { ascending: true })
      .limit(8),
    admin
      .from("lead_activities")
      .select("lead_id, created_at")
      .eq("kind", "customer_follow_up")
      .not("actor_user_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(FIRST_RESPONSE_SCAN_LIMIT),
  ]);

  const inquiryActivity = bucketCountsByUtcDay(
    (inquiryTimestamps.data ?? []).map((r) => r.created_at),
    dayKeys,
  );
  const popularVehicles = countBySlug(
    (vehicleRows.data ?? []).map((r) => ({ slug: r.vehicle_slug })),
  );

  const firstReplyByLead = new Map<string, string>();
  for (const row of staffReplies.data ?? []) {
    if (!firstReplyByLead.has(row.lead_id)) firstReplyByLead.set(row.lead_id, row.created_at);
  }
  const leadIds = [...firstReplyByLead.keys()];
  let avgFirstResponseLabel: string | null = null;
  let avgFirstResponseSampleSize = 0;
  if (leadIds.length > 0) {
    const { data: leadRows } = await admin.from("leads").select("id, created_at").in("id", leadIds);
    const samples = (leadRows ?? []).flatMap((lead) => {
      const first = firstReplyByLead.get(lead.id);
      if (!first) return [];
      return [{ leadCreatedAt: lead.created_at, firstStaffReplyAt: first }];
    });
    const { medianMs, sampleSize } = medianFirstResponseMs(samples);
    avgFirstResponseSampleSize = sampleSize;
    avgFirstResponseLabel = formatDurationMs(medianMs);
  }

  const { data: staffDirectory } = await admin
    .from("staff_members")
    .select("user_id, display_name, email");
  const actorName = new Map(
    (staffDirectory ?? []).map((m) => [m.user_id, m.display_name || m.email || "Staff"]),
  );

  const recentInquiries: RecentInquiryRow[] = (recentInquiryRows.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    vehicleSlug: row.vehicle_slug,
    createdAt: row.created_at,
    leadId: normalizeLeadId(row.leads),
  }));

  const recentStaffActivity: RecentStaffActivityRow[] = (recentActivities.data ?? [])
    .filter((row) => !STAFF_ACTIVITY_KINDS_HIDE.has(row.kind))
    .slice(0, 12)
    .map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      kind: row.kind,
      bodyPreview: activityPreview(row.body, row.kind),
      createdAt: row.created_at,
      actorLabel: (row.actor_user_id && actorName.get(row.actor_user_id)) || "Staff",
    }));

  const upcomingFollowUps: UpcomingFollowUpRow[] = (upcomingTasks.data ?? []).map((row) => {
    const lead = normalizeLeadJoin(row.leads);
    return {
      id: row.id,
      leadId: row.lead_id,
      title: row.title,
      dueAt: row.due_at,
      leadName: lead?.name ?? null,
      leadEmail: lead?.email ?? "Lead",
    };
  });

  const pipelineStages = PIPELINE_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: stats.stageCounts[stage] ?? 0,
  }));

  return {
    stats,
    kpis: {
      totalInquiries: totalInquiries.count ?? 0,
      inquiriesToday: inquiriesToday.count ?? 0,
      leadsAwaitingResponse: awaitingResponse.count ?? 0,
      qualifiedLeads: qualified.count ?? 0,
      wonDeals: won.count ?? 0,
      overdueFollowUps: overdueFollowUps.count ?? 0,
      failedIntegrations: stats.failedEvents,
      avgFirstResponseLabel,
      avgFirstResponseSampleSize,
    },
    inquiryActivity,
    pipelineStages,
    popularVehicles,
    recentInquiries,
    recentStaffActivity,
    upcomingFollowUps,
  };
}

function normalizeLeadJoin(value: unknown): { name: string | null; email: string } | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) return normalizeLeadJoin(value[0]);
  const row = value as Record<string, unknown>;
  return {
    name: typeof row.name === "string" ? row.name : null,
    email: typeof row.email === "string" ? row.email : "Lead",
  };
}
