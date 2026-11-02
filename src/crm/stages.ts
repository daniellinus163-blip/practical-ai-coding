export const PIPELINE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "quote_sent",
  "negotiation",
  "won",
  "lost",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  quote_sent: "Quote sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export function isPipelineStage(value: string): value is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(value);
}
