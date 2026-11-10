import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadFollowUpMap = Map<string, string>;

export async function loadNextFollowUpDates(
  admin: SupabaseClient,
  leadIds: string[],
): Promise<LeadFollowUpMap> {
  if (leadIds.length === 0) return new Map();
  const { data } = await admin
    .from("lead_tasks")
    .select("lead_id, due_at")
    .in("lead_id", leadIds)
    .is("completed_at", null)
    .order("due_at", { ascending: true });

  const map: LeadFollowUpMap = new Map();
  for (const row of data ?? []) {
    if (!map.has(row.lead_id) && row.due_at) map.set(row.lead_id, row.due_at);
  }
  return map;
}
