import { markInquiryNotificationsReadAction } from "@/app/account/inquiries/actions";

type Item = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function InquiryNotifications({ inquiryId, items }: { inquiryId: string; items: Item[] }) {
  if (items.length === 0) return null;
  const hasUnread = items.some((item) => !item.read_at);
  return (
    <div className="space-y-2 rounded-md border border-[var(--accent)]/30 bg-[var(--bg-2)] p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">Team replies</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="text-sm">
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-[var(--ink)]">{item.body}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{formatWhen(item.created_at)}</p>
          </li>
        ))}
      </ul>
      {hasUnread ? (
        <form action={markInquiryNotificationsReadAction}>
          <input type="hidden" name="inquiryId" value={inquiryId} />
          <button type="submit" className="text-xs underline">
            Mark as read
          </button>
        </form>
      ) : (
        <p className="text-xs text-[var(--muted)]">Read</p>
      )}
    </div>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}
