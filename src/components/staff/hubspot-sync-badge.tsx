import {
  hubspotContactRecordUrl,
  hubspotDealRecordUrl,
  hubspotPortalIdFromEnv,
} from "@/crm/hubspot-links";
import { HUBSPOT_STATE_LABEL, type HubSpotObjectSync } from "@/crm/hubspot-sync-status";
import { HubSpotSyncRetryForm } from "@/components/staff/hubspot-sync-retry-form";

const STATE_CLASS: Record<HubSpotObjectSync["state"], string> = {
  synced: "text-emerald-800",
  pending: "text-amber-800",
  failed: "text-red-700",
  retry_required: "text-red-700",
  not_configured: "text-[var(--muted)]",
  not_attempted: "text-[var(--muted)]",
};

export function HubSpotSyncRow({
  title,
  sync,
  recordKind,
  retryEventId,
  leadId,
}: {
  title: string;
  sync: HubSpotObjectSync;
  recordKind: "contact" | "deal";
  retryEventId: string | null;
  leadId: string;
}) {
  const portalId = hubspotPortalIdFromEnv();
  const recordId = sync.recordId;
  const url =
    portalId && recordId
      ? recordKind === "contact"
        ? hubspotContactRecordUrl(portalId, recordId)
        : hubspotDealRecordUrl(portalId, recordId)
      : null;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{title}</dt>
        <span className={`text-xs font-medium ${STATE_CLASS[sync.state]}`}>
          {HUBSPOT_STATE_LABEL[sync.state]}
        </span>
      </div>
      <dd className="text-sm">
        {sync.state === "synced" && url ? (
          <a className="underline" href={url} rel="noopener noreferrer" target="_blank">
            Open in HubSpot
          </a>
        ) : sync.state === "synced" && recordId ? (
          <span>Record {recordId} — set HUBSPOT_PORTAL_ID for links.</span>
        ) : (
          <span>{sync.detail ?? "No HubSpot attempt logged yet."}</span>
        )}
      </dd>
      {sync.canRetry && retryEventId ? (
        <HubSpotSyncRetryForm leadId={leadId} eventId={retryEventId} />
      ) : null}
    </div>
  );
}
