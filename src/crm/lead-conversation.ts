import type { SupabaseClient } from "@supabase/supabase-js";
import { integrationHealth, loadIntegrationConfig } from "@/events/config";

export const CUSTOMER_VISIBLE_KINDS = ["inquiry_received", "customer_follow_up", "customer_reply"] as const;
export const INTERNAL_NOTE_KIND = "note" as const;

export type ConversationKind = (typeof CUSTOMER_VISIBLE_KINDS)[number] | typeof INTERNAL_NOTE_KIND | string;

export type EmailDeliveryMeta = {
  event_id?: string;
  integration?: string;
  status?: "succeeded" | "failed" | "skipped" | "queued" | "unknown";
  error?: string | null;
  checked_at?: string;
  dry_run?: boolean;
};

export type ActivityRow = {
  id: string;
  kind: string;
  body: string | null;
  created_at: string;
  actor_user_id: string | null;
  meta?: Record<string, unknown> | null;
};

export type ConversationMessage = {
  id: string;
  kind: ConversationKind;
  body: string;
  createdAt: string;
  actorUserId: string | null;
  actorLabel: string;
  direction: "customer" | "staff" | "system";
  emailDelivery: EmailDeliveryMeta | null;
};

export type ResendEmailAdvisory = {
  resendConfigured: boolean;
  usingTestSender: boolean;
  dryRun: boolean;
  summary: string;
};

export function parseEmailDeliveryMeta(meta: Record<string, unknown> | null | undefined): EmailDeliveryMeta | null {
  if (!meta || typeof meta !== "object") return null;
  const email = meta.email;
  if (!email || typeof email !== "object") return null;
  const row = email as Record<string, unknown>;
  const status = row.status;
  if (
    status !== "succeeded" &&
    status !== "failed" &&
    status !== "skipped" &&
    status !== "queued" &&
    status !== "unknown"
  ) {
    return null;
  }
  return {
    event_id: typeof row.event_id === "string" ? row.event_id : undefined,
    integration: typeof row.integration === "string" ? row.integration : undefined,
    status,
    error: typeof row.error === "string" ? row.error : null,
    checked_at: typeof row.checked_at === "string" ? row.checked_at : undefined,
    dry_run: row.dry_run === true,
  };
}

export function emailDeliveryLabel(delivery: EmailDeliveryMeta | null): string | null {
  if (!delivery) return null;
  if (delivery.dry_run) return "Email dry-run (not sent to provider)";
  switch (delivery.status) {
    case "succeeded":
      return "Email accepted by Resend (not proof of inbox delivery)";
    case "failed":
      return delivery.error ? `Email failed: ${delivery.error}` : "Email failed";
    case "skipped":
      return delivery.error ? `Email skipped: ${delivery.error}` : "Email skipped (not configured or not permitted)";
    case "queued":
      return "Email queued — check Integrations for final status";
    default:
      return "Email status unknown";
  }
}

export function buildConversationMessages(
  activities: ActivityRow[],
  actorNames: Map<string, string>,
  customerName: string,
): ConversationMessage[] {
  return activities
    .filter((row) => (CUSTOMER_VISIBLE_KINDS as readonly string[]).includes(row.kind))
    .map((row) => toConversationMessage(row, actorNames, customerName))
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function buildInternalNotes(activities: ActivityRow[], actorNames: Map<string, string>): ConversationMessage[] {
  return activities
    .filter((row) => row.kind === INTERNAL_NOTE_KIND)
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      body: row.body ?? "",
      createdAt: row.created_at,
      actorUserId: row.actor_user_id,
      actorLabel: labelActor(row.actor_user_id, actorNames, "Staff"),
      direction: "staff" as const,
      emailDelivery: null,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function toConversationMessage(
  row: ActivityRow,
  actorNames: Map<string, string>,
  customerName: string,
): ConversationMessage {
  const direction =
    row.kind === "customer_follow_up" ? "staff" : row.kind === "customer_reply" || row.kind === "inquiry_received" ? "customer" : "system";
  const defaultActor =
    direction === "customer" ? customerName : direction === "staff" ? "FormShift team" : "System";
  return {
    id: row.id,
    kind: row.kind,
    body: row.body ?? "",
    createdAt: row.created_at,
    actorUserId: row.actor_user_id,
    actorLabel: labelActor(row.actor_user_id, actorNames, defaultActor),
    direction,
    emailDelivery: row.kind === "customer_follow_up" ? parseEmailDeliveryMeta(row.meta ?? null) : null,
  };
}

function labelActor(userId: string | null, names: Map<string, string>, fallback: string) {
  if (!userId) return fallback;
  return names.get(userId) ?? fallback;
}

export function resendEmailAdvisory(): ResendEmailAdvisory {
  const config = loadIntegrationConfig();
  const health = integrationHealth(config);
  const parts: string[] = [];
  if (health.dryRun) parts.push("INTEGRATIONS_DRY_RUN is on — no live customer email is sent.");
  if (!health.resend) parts.push("Resend is not fully configured (API key and RESEND_FROM_EMAIL).");
  if (health.resendTestSender) {
    parts.push(
      "RESEND_FROM_EMAIL uses resend.dev. Resend only delivers to addresses you have verified unless you verify your own domain.",
    );
  }
  parts.push(
    "Inbound email replies are not connected. Customers with an account can reply on Account → Inquiries; email thread replies will not appear here until inbound Resend (or another provider) is configured.",
  );
  return {
    resendConfigured: health.resend,
    usingTestSender: health.resendTestSender,
    dryRun: health.dryRun,
    summary: parts.join(" "),
  };
}

export async function attachEmailDeliveryToActivity(
  admin: SupabaseClient,
  activityId: string,
  eventId: string | null,
): Promise<EmailDeliveryMeta> {
  const config = loadIntegrationConfig();
  const dryRun = config.dryRun;

  if (!eventId) {
    const meta: EmailDeliveryMeta = {
      status: "unknown",
      error: "worker_event_missing",
      checked_at: new Date().toISOString(),
      dry_run: dryRun,
    };
    await admin.from("lead_activities").update({ meta: { email: meta } }).eq("id", activityId);
    return meta;
  }

  const { data: deliveries } = await admin
    .from("automation_event_deliveries")
    .select("status, integration, last_error, retryable")
    .eq("event_id", eventId)
    .in("integration", ["resend"]);

  const resend = deliveries?.find((row) => row.integration === "resend");
  let status: EmailDeliveryMeta["status"] = "queued";
  let error: string | null = null;

  if (dryRun && !resend) {
    status = "skipped";
    error = "dry_run";
  } else if (!resend) {
    status = "queued";
  } else if (resend.status === "succeeded") {
    status = "succeeded";
  } else if (resend.status === "skipped") {
    status = "skipped";
    error = resend.last_error;
  } else if (resend.status === "failed") {
    status = "failed";
    error = resend.last_error;
  }

  const meta: EmailDeliveryMeta = {
    event_id: eventId,
    integration: "resend",
    status,
    error,
    checked_at: new Date().toISOString(),
    dry_run: dryRun,
  };

  await admin.from("lead_activities").update({ meta: { email: meta } }).eq("id", activityId);
  return meta;
}

export async function resolveStaffActorNames(
  admin: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { data } = await admin
    .from("staff_members")
    .select("user_id, display_name, email")
    .in("user_id", unique);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.user_id, row.display_name || row.email || "Staff");
  }
  return map;
}
