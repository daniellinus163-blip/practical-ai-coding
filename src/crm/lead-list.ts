import { isPipelineStage, type PipelineStage } from "@/crm/stages";

export const LEAD_PAGE_SIZE = 20;

export type LeadSort = "newest" | "oldest" | "follow_up";

export type LeadListFilters = {
  q: string;
  stage: PipelineStage | "";
  assignedParam: string;
  assignedUserId: string;
  vehicle: string;
  from: string;
  to: string;
  sort: LeadSort;
  page: number;
};

export function parseLeadListFilters(
  params: Record<string, string | string[] | undefined>,
  staffUserId: string,
): LeadListFilters {
  const pick = (key: string) => String(Array.isArray(params[key]) ? params[key][0] : params[key] ?? "").trim();
  const q = pick("q")
    .replace(/[%_,()]/g, "")
    .slice(0, 80);
  const stageRaw = pick("stage");
  const stage = isPipelineStage(stageRaw) ? stageRaw : "";
  const sortRaw = pick("sort");
  const sort: LeadSort = sortRaw === "oldest" || sortRaw === "follow_up" ? sortRaw : "newest";
  const page = Math.max(1, Number(pick("page") || "1") || 1);
  const assignedParam = pick("assigned");
  const assignedUserId =
    assignedParam === "me"
      ? staffUserId
      : assignedParam === "unassigned"
        ? "unassigned"
        : assignedParam;

  return {
    q,
    stage,
    assignedParam,
    assignedUserId,
    vehicle: pick("vehicle").slice(0, 80),
    from: pick("from"),
    to: pick("to"),
    sort,
    page,
  };
}

export function leadSearchOrClause(q: string): { mode: "text" | "id"; value: string } | null {
  if (!q) return null;
  const ref = q.replace(/^FSA-/i, "").trim();
  if (/^[0-9a-f-]{6,36}$/i.test(ref)) {
    return { mode: "id", value: ref.toLowerCase() };
  }
  return { mode: "text", value: q };
}

export function leadListQueryString(filters: LeadListFilters, page?: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.assignedParam) params.set("assigned", filters.assignedParam);
  if (filters.vehicle) params.set("vehicle", filters.vehicle);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  const p = page ?? filters.page;
  if (p > 1) params.set("page", String(p));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
