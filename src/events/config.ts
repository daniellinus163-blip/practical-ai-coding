import { getEmailSiteUrl } from "@/lib/supabase/env";
import { validEmail } from "@/lib/validation";

export type IntegrationConfig = {
  dryRun: boolean;
  siteUrl: string;
  workerSecret: string;
  workerSecrets: string[];
  webhookSecret: string;
  n8nWebhookUrl: string;
  n8nSecret: string;
  hubspotToken: string;
  hubspotPipelineId: string;
  hubspotStages: Record<string, string>;
  resendApiKey: string;
  resendFrom: string;
  resendInternalTo: string;
};

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

const STAGE_ENV: Record<string, string> = {
  new: "HUBSPOT_STAGE_NEW",
  contacted: "HUBSPOT_STAGE_CONTACTED",
  qualified: "HUBSPOT_STAGE_QUALIFIED",
  quote_sent: "HUBSPOT_STAGE_QUOTE_SENT",
  negotiation: "HUBSPOT_STAGE_NEGOTIATION",
  won: "HUBSPOT_STAGE_WON",
  lost: "HUBSPOT_STAGE_LOST",
};

function workerSecretsFromEnv(): string[] {
  return [...new Set([env("EVENTS_WORKER_SECRET"), env("CRON_SECRET")].filter(Boolean))];
}

export function loadIntegrationConfig(): IntegrationConfig {
  const stages: Record<string, string> = {};
  for (const [status, key] of Object.entries(STAGE_ENV)) {
    const value = env(key);
    if (value) stages[status] = value;
  }
  const workerSecrets = workerSecretsFromEnv();
  return {
    dryRun: env("INTEGRATIONS_DRY_RUN") !== "false",
    siteUrl: getEmailSiteUrl(),
    workerSecret: workerSecrets[0] ?? "",
    workerSecrets,
    webhookSecret: env("EVENTS_WEBHOOK_SECRET"),
    n8nWebhookUrl: env("N8N_WEBHOOK_URL"),
    n8nSecret: env("N8N_WEBHOOK_SECRET"),
    hubspotToken: env("HUBSPOT_ACCESS_TOKEN"),
    hubspotPipelineId: env("HUBSPOT_PIPELINE_ID"),
    hubspotStages: stages,
    resendApiKey: env("RESEND_API_KEY"),
    resendFrom: env("RESEND_FROM_EMAIL"),
    resendInternalTo: env("RESEND_INTERNAL_TO"),
  };
}

export function integrationHealth(config: IntegrationConfig) {
  return {
    dryRun: config.dryRun,
    n8n: Boolean(config.n8nWebhookUrl && config.n8nSecret),
    hubspot: Boolean(config.hubspotToken),
    hubspotStagesConfigured: Object.keys(config.hubspotStages).length,
    resend: Boolean(config.resendApiKey && config.resendFrom && validEmail(config.resendFrom)),
    resendTestSender: senderDomain(config.resendFrom) === "resend.dev",
    resendInternalConfigured: Boolean(config.resendInternalTo && validEmail(config.resendInternalTo)),
    workerAuthConfigured: Boolean(config.workerSecret),
  };
}

function senderDomain(from: string): string {
  const at = from.lastIndexOf("@");
  return at >= 0 ? from.slice(at + 1).toLowerCase() : "";
}

export function integrationsFor(type: string): Array<"internal" | "n8n" | "hubspot" | "resend" | "resend_staff"> {
  switch (type) {
    case "inquiry.received":
      return ["resend_staff", "internal", "hubspot", "resend"];
    case "lead.stage_changed":
      return ["hubspot"];
    case "follow_up.reminder":
      return ["internal", "resend"];
    default:
      return [];
  }
}
