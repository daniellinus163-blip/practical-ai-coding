import type { ConversationMessage, ResendEmailAdvisory } from "@/crm/lead-conversation";
import { emailDeliveryLabel } from "@/crm/lead-conversation";
import { LeadCustomerReplyForm } from "@/components/staff/lead-forms";

type VehicleSummary = { name: string | null; slug: string | null; href: string | null };

type InquirySummary = {
  message: string;
  submittedAt: string | null;
  configuration: Record<string, unknown> | null;
};

type Props = {
  leadId: string;
  customerName: string;
  customerEmail: string;
  vehicle: VehicleSummary;
  inquiry: InquirySummary | null;
  messages: ConversationMessage[];
  internalNotes: ConversationMessage[];
  emailAdvisory: ResendEmailAdvisory;
};

export function LeadCommunicationCentre({
  leadId,
  customerName,
  customerEmail,
  vehicle,
  inquiry,
  messages,
  internalNotes,
  emailAdvisory,
}: Props) {
  return (
    <section className="space-y-6 border border-[var(--line)] bg-[var(--card)] p-4">
      <header className="space-y-2 border-b border-[var(--line)] pb-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">Customer communication</p>
        <h3 className="font-display text-2xl">{customerName}</h3>
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Email</dt>
            <dd className="font-mono text-[var(--ink)]">{customerEmail}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Vehicle</dt>
            <dd>
              {vehicle.href && vehicle.name ? (
                <a href={vehicle.href} className="underline">
                  {vehicle.name}
                </a>
              ) : (
                vehicle.name ?? vehicle.slug ?? "—"
              )}
            </dd>
          </div>
        </dl>
        <p className="rounded-md border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          {emailAdvisory.summary}
        </p>
      </header>

      {inquiry ? (
        <article className="rounded-md border border-[var(--line)] bg-[var(--bg-2)]/50 p-3 text-sm">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Original inquiry</p>
          <p className="mt-2 whitespace-pre-wrap">{inquiry.message}</p>
          {inquiry.submittedAt ? (
            <p className="mt-2 text-xs text-[var(--muted)]">Submitted {formatWhen(inquiry.submittedAt)}</p>
          ) : null}
          {inquiry.configuration ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Studio configuration is summarized in the vehicle configuration section above.
            </p>
          ) : null}
        </article>
      ) : null}

      <div className="space-y-3">
        <h4 className="font-display text-lg">Conversation</h4>
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No messages yet beyond the original inquiry.</p>
        ) : (
          <ol className="space-y-3">
            {messages.map((message) => (
              <li
                key={message.id}
                className={
                  message.direction === "staff"
                    ? "ml-4 border-l-2 border-[var(--accent)] pl-3"
                    : "mr-4 border-r-2 border-[var(--line)] pr-3 text-right"
                }
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  {message.actorLabel} · {formatWhen(message.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink)]">{message.body}</p>
                {message.emailDelivery ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">{emailDeliveryLabel(message.emailDelivery)}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>

      <LeadCustomerReplyForm leadId={leadId} customerEmail={customerEmail} hasAccountHint />

      <div className="space-y-3 border-t border-[var(--line)] pt-4">
        <h4 className="font-display text-lg">Internal notes</h4>
        <p className="text-xs text-[var(--muted)]">Never emailed to the customer. Add notes from the sidebar form.</p>
        {internalNotes.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No internal notes on this lead.</p>
        ) : (
          <ul className="space-y-2">
            {internalNotes.map((note) => (
              <li key={note.id} className="rounded-md bg-[var(--bg-2)]/70 px-3 py-2 text-sm">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  {note.actorLabel} · {formatWhen(note.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  } catch {
    return value;
  }
}
