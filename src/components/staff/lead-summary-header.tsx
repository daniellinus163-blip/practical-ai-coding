import Link from "next/link";
import { formatLeadReference } from "@/crm/lead-automation";
import type { HubSpotStageSync, LeadIntegrationView } from "@/crm/lead-automation";
import { hubspotDealRecordUrl, hubspotPortalIdFromEnv } from "@/crm/hubspot-links";
import { HUBSPOT_STATE_LABEL } from "@/crm/hubspot-sync-status";
import { isPipelineStage, STAGE_LABELS } from "@/crm/stages";
import { PRIORITY_LABELS, type LeadPriority } from "@/crm/lead-priority";
import { HubSpotSyncRetryForm } from "@/components/staff/hubspot-sync-retry-form";
import { CopyLeadRefButton } from "@/components/staff/copy-lead-ref";

type Props = {
  leadId: string;
  name: string | null;
  email: string | null;
  source: string | null;
  status: string;
  priority: LeadPriority;
  vehicleName: string | null;
  vehicleSlug: string | null;
  inquiryDate: string | null;
  assignedLabel: string | null;
  followUpDue: string | null;
  hubspot: {
    contactId: string | null;
    dealId: string | null;
    stageSync: HubSpotStageSync;
    dealSync: LeadIntegrationView["hubspotDealSync"];
    inquiryEventId: string | null;
  };
};

export function LeadSummaryHeader({
  leadId,
  name,
  email,
  source,
  status,
  priority,
  vehicleName,
  vehicleSlug,
  inquiryDate,
  assignedLabel,
  followUpDue,
  hubspot,
}: Props) {
  const ref = formatLeadReference(leadId);
  const stageLabel = isPipelineStage(status) ? STAGE_LABELS[status] : status;
  const portalId = hubspotPortalIdFromEnv();
  const dealUrl =
    portalId && hubspot.dealSync.recordId && hubspot.dealSync.state === "synced"
      ? hubspotDealRecordUrl(portalId, hubspot.dealSync.recordId)
      : null;

  return (
    <section className="staff-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">Lead {ref}</p>
          <h2 className="font-display text-3xl">{name ?? "Lead"}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            <CopyLeadRefButton value={ref} /> · {email}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">{stageLabel}</p>
          <p className="text-xs text-[var(--muted)]">{PRIORITY_LABELS[priority]} priority</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Inquiry date</dt>
          <dd>{inquiryDate ? formatWhen(inquiryDate) : "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Vehicle</dt>
          <dd>
            {vehicleSlug ? (
              <Link className="underline" href={`/cars/${vehicleSlug}`}>
                {vehicleName ?? vehicleSlug}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Source</dt>
          <dd>{source ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Assigned</dt>
          <dd>{assignedLabel ?? "Unassigned"}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Follow-up due</dt>
          <dd>{followUpDue ?? "No open task"}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">HubSpot deal</dt>
          <dd>
            <span className="font-medium">{HUBSPOT_STATE_LABEL[hubspot.dealSync.state]}</span>
            {dealUrl ? (
              <>
                {" "}
                ·{" "}
                <a className="underline" href={dealUrl} rel="noopener noreferrer" target="_blank">
                  Open in HubSpot
                </a>
              </>
            ) : hubspot.dealSync.detail ? (
              <span className="mt-1 block text-xs text-[var(--muted)]">{hubspot.dealSync.detail}</span>
            ) : null}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
        <span>Pipeline stage sync: {hubspot.stageSync.deliveryStatus ?? "No stage change events yet"}</span>
        {hubspot.stageSync.lastError ? (
          <span className="text-[var(--danger)]">{hubspot.stageSync.lastError}</span>
        ) : null}
        {hubspot.stageSync.canRetry && hubspot.stageSync.eventId ? (
          <HubSpotSyncRetryForm leadId={leadId} eventId={hubspot.stageSync.eventId} />
        ) : null}
        {hubspot.dealSync.canRetry && hubspot.inquiryEventId ? (
          <HubSpotSyncRetryForm leadId={leadId} eventId={hubspot.inquiryEventId} />
        ) : null}
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
