import type { IntegrationCard } from "@/crm/integration-snapshot";

const STATE_LABEL: Record<IntegrationCard["state"], string> = {
  connected: "Connected (recent activity in database)",
  configured_unverified: "Configured — not verified live",
  processing: "Processing",
  partial: "Partially operational",
  action_required: "Action required",
  failed: "Failed",
};

const STATE_CLASS: Record<IntegrationCard["state"], string> = {
  connected: "text-emerald-700",
  configured_unverified: "text-[var(--muted)]",
  processing: "text-amber-700",
  partial: "text-amber-700",
  action_required: "text-red-700",
  failed: "text-red-700",
};

export function IntegrationHealthCards({ cards }: { cards: IntegrationCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map((card) => (
        <article key={card.key} className="staff-card">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{card.title}</p>
          <p className={`mt-1 text-sm font-medium ${STATE_CLASS[card.state]}`}>{STATE_LABEL[card.state]}</p>
          <p className="mt-2 text-sm">{card.summary}</p>
          <ul className="mt-3 list-inside list-disc text-xs text-[var(--muted)]">
            {card.details.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
