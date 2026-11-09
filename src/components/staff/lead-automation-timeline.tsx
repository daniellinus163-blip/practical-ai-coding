import type { TimelineItem } from "@/crm/build-lead-timeline";
import { EmptyState } from "@/components/catalog/empty-state";

const TONE_CLASS: Record<TimelineItem["tone"], string> = {
  ok: "border-l-emerald-600",
  warn: "border-l-amber-500",
  error: "border-l-red-600",
  neutral: "border-l-[var(--line)]",
};

export function LeadAutomationTimeline({
  items,
  inquirySubmittedAt,
}: {
  items: TimelineItem[];
  inquirySubmittedAt?: string | null;
}) {
  const list =
    items.length > 0
      ? items
      : inquirySubmittedAt
        ? [
            {
              id: "only-inquiry",
              at: inquirySubmittedAt,
              title: "Inquiry stored — automation may still be queued",
              tone: "neutral" as const,
            },
          ]
        : [];

  if (list.length === 0) {
    return <EmptyState title="No automation history" body="Events appear after an inquiry is submitted." />;
  }

  return (
    <ol className="space-y-2">
      {list.map((item) => (
        <li
          key={item.id}
          className={`border border-[var(--line)] border-l-4 bg-[var(--card)] p-3 text-sm ${TONE_CLASS[item.tone]}`}
        >
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{formatWhen(item.at)}</p>
          <p className="mt-1 font-medium">{item.title}</p>
          {item.detail ? <p className="mt-1 text-[var(--muted)]">{item.detail}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}
