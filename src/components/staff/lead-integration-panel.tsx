import {
  hubspotContactRecordUrl,
  hubspotDealRecordUrl,
  hubspotPortalIdFromEnv,
} from "@/crm/hubspot-links";
import type { LeadIntegrationView } from "@/crm/lead-automation";
import { formatLeadReference } from "@/crm/lead-automation";
import { CopyLeadRefButton } from "@/components/staff/copy-lead-ref";
import { LeadAutomationTimeline } from "@/components/staff/lead-automation-timeline";

export function LeadIntegrationPanel({
  leadId,
  inquiryId,
  inquiryCreatedAt,
  configurationId,
  integration,
}: {
  leadId: string;
  inquiryId: string | null;
  inquiryCreatedAt: string | null;
  configurationId: string | null;
  integration: LeadIntegrationView;
}) {
  const portalId = hubspotPortalIdFromEnv();
  const contactUrl =
    portalId && integration.hubspotContactId
      ? hubspotContactRecordUrl(portalId, integration.hubspotContactId)
      : null;
  const dealUrl =
    portalId && integration.hubspotDealId ? hubspotDealRecordUrl(portalId, integration.hubspotDealId) : null;

  const customerEmail = integration.deliveries.find(
    (d) => d.integration === "resend" && d.status !== "pending",
  );
  const staffEmail = integration.deliveries.find(
    (d) => d.integration === "resend_staff" && d.status !== "pending",
  );

  return (
    <div className="space-y-6">
      <section className="border border-[var(--line)] bg-[var(--card)] p-4">
        <h3 className="font-display text-xl">Automation & CRM</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Internal ref {formatLeadReference(leadId)} ·{" "}
          <CopyLeadRefButton value={formatLeadReference(leadId)} />
        </p>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Inquiry id</dt>
            <dd className="font-mono text-xs">{inquiryId ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Automation event</dt>
            <dd>{integration.eventSummary.inquiryEventStatus ?? "Not queued"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">HubSpot contact</dt>
            <dd>
              {integration.hubspotContactId ? (
                contactUrl ? (
                  <a className="underline" href={contactUrl} rel="noopener noreferrer" target="_blank">
                    Open in HubSpot ({integration.hubspotContactId})
                  </a>
                ) : (
                  <span>
                    Synced id {integration.hubspotContactId} — set HUBSPOT_PORTAL_ID for links.
                  </span>
                )
              ) : (
                "Not synced"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">HubSpot deal</dt>
            <dd>
              {integration.hubspotDealId ? (
                dealUrl ? (
                  <a className="underline" href={dealUrl} rel="noopener noreferrer" target="_blank">
                    Open in HubSpot ({integration.hubspotDealId})
                  </a>
                ) : (
                  <span>Synced id {integration.hubspotDealId} — set HUBSPOT_PORTAL_ID for links.</span>
                )
              ) : (
                "Not synced"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Customer email</dt>
            <dd>{deliverySummary(customerEmail)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Staff notification</dt>
            <dd>{deliverySummary(staffEmail)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">24h follow-up</dt>
            <dd>
              {integration.eventSummary.followUpStatus
                ? `${integration.eventSummary.followUpStatus}${
                    integration.eventSummary.followUpDueAt
                      ? ` · due ${integration.eventSummary.followUpDueAt}`
                      : ""
                  }`
                : "Not scheduled"}
            </dd>
          </div>
          {configurationId ? (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Saved configuration</dt>
              <dd className="font-mono text-xs">{configurationId}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-xl">Integration timeline</h3>
        <p className="text-xs text-[var(--muted)]">
          Chronological automation events and delivery outcomes from Supabase — not marketing metrics.
        </p>
        <LeadAutomationTimeline items={integration.timeline} inquirySubmittedAt={inquiryCreatedAt} />
      </section>
    </div>
  );
}

function deliverySummary(
  row: { status: string; last_error: string | null; external_id: string | null } | undefined,
): string {
  if (!row) return "No attempt logged";
  if (row.status === "succeeded") {
    return `API accepted (${row.external_id ? `id ${row.external_id}` : "no id"}) — delivery not confirmed`;
  }
  if (row.status === "skipped") return `Skipped${row.last_error ? `: ${row.last_error}` : ""}`;
  if (row.status === "failed") return `Failed${row.last_error ? `: ${row.last_error}` : ""}`;
  return row.status;
}
