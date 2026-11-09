import { followUpEmail, inquiryConfirmationEmail, internalInquiryEmail, staffReplyEmail } from "@/events/emails";
import type { IntegrationConfig } from "@/events/config";
import { networkFailure, resultFromHttp } from "@/events/http";
import { validateEventPayload } from "@/events/payload";
import { safeLogMessage } from "@/events/log";
import type { AutomationEvent, ContactContext, DeliveryResult, IntegrationName } from "@/events/types";
import { validEmail } from "@/lib/validation";

export type MappingStore = {
  get: (provider: string, object: string, localType: string, localId: string) => Promise<string | null>;
  put: (provider: string, object: string, localType: string, localId: string, providerId: string) => Promise<void>;
};

export type InternalStore = {
  ensureFollowUpTask: (leadId: string, sourceKey: string, title: string, due: string) => Promise<string | null>;
};

type FetchLike = typeof fetch;

export function createAdapters(options: {
  config: IntegrationConfig;
  mappings: MappingStore;
  internal: InternalStore;
  fetchImpl?: FetchLike;
}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const { config } = options;

  async function n8n(): Promise<DeliveryResult> {
    return { status: "skipped", retryable: false, error: "n8n_not_used" };
  }

  async function hubspot(event: AutomationEvent, contact: ContactContext): Promise<DeliveryResult> {
    const invalid = validateEventPayload(event.event_type, event.payload);
    if (invalid) return { status: "failed", retryable: false, error: invalid };
    if (!config.hubspotToken) return { status: "skipped", retryable: false, error: "hubspot_not_configured" };
    if (!contact.email || !validEmail(contact.email)) {
      return { status: "skipped", retryable: false, error: "missing_email" };
    }

    try {
      const contactId = await upsertHubspotContact(fetchImpl, config, options.mappings, contact);
      if (!contactId.ok) return contactId.result;
      let dealId: string | null = null;
      if (event.event_type === "inquiry.received" || event.event_type === "lead.stage_changed") {
        const deal = await upsertHubspotDeal(fetchImpl, config, options.mappings, contact, contactId.id, event);
        if (!deal.ok) return deal.result;
        dealId = deal.id;
      }
      return {
        status: "succeeded",
        retryable: false,
        externalId: dealId ? `contact:${contactId.id};deal:${dealId}` : `contact:${contactId.id}`,
      };
    } catch (error) {
      return networkFailure(error);
    }
  }

  async function resend(event: AutomationEvent, contact: ContactContext): Promise<DeliveryResult> {
    const blocked = resendBlocked(event, config);
    if (blocked) return blocked;
    if (!contact.email || !validEmail(contact.email)) {
      return { status: "skipped", retryable: false, error: "missing_email" };
    }
    if (event.event_type === "inquiry.received") {
      return sendResend(
        fetchImpl,
        config,
        contact.email,
        inquiryConfirmationEmail({
          name: contact.name || "there",
          vehicleSlug: contact.vehicleSlug,
          siteUrl: config.siteUrl,
          inquiryId: contact.inquiryId,
        }),
      );
    }
    if (event.event_type === "follow_up.reminder") {
      return sendResend(
        fetchImpl,
        config,
        contact.email,
        followUpEmail({
          name: contact.name || "there",
          vehicleSlug: contact.vehicleSlug,
          siteUrl: config.siteUrl,
          inquiryId: contact.inquiryId,
        }),
      );
    }
    if (event.event_type === "inquiry.staff_reply") {
      const body = contact.staffReplyBody?.trim();
      if (!body) return { status: "failed", retryable: false, error: "staff_reply_body_missing" };
      return sendResend(
        fetchImpl,
        config,
        contact.email,
        staffReplyEmail({
          name: contact.name || "there",
          vehicleSlug: contact.vehicleSlug,
          siteUrl: config.siteUrl,
          inquiryId: contact.inquiryId,
          message: body,
        }),
      );
    }
    return { status: "skipped", retryable: false, error: "no_email_for_event" };
  }

  async function resendStaff(event: AutomationEvent, contact: ContactContext): Promise<DeliveryResult> {
    const blocked = resendBlocked(event, config);
    if (blocked) return blocked;
    if (event.event_type !== "inquiry.received") {
      return { status: "skipped", retryable: false, error: "no_email_for_event" };
    }
    if (!config.resendInternalTo || !validEmail(config.resendInternalTo)) {
      return { status: "skipped", retryable: false, error: "resend_internal_not_configured" };
    }
    return sendResend(
      fetchImpl,
      config,
      config.resendInternalTo,
      internalInquiryEmail({
        vehicleSlug: contact.vehicleSlug,
        leadId: contact.leadId,
        inquiryId: contact.inquiryId,
        siteUrl: config.siteUrl,
        customerName: contact.name,
      }),
    );
  }

  async function internal(event: AutomationEvent): Promise<DeliveryResult> {
    if (event.event_type !== "inquiry.received" && event.event_type !== "follow_up.reminder") {
      return { status: "skipped", retryable: false };
    }
    const leadId = typeof event.payload.lead_id === "string" ? event.payload.lead_id : event.lead_id;
    const inquiryId = typeof event.payload.inquiry_id === "string" ? event.payload.inquiry_id : event.entity_id;
    if (!leadId || !inquiryId) return { status: "failed", retryable: false, error: "missing_ids" };
    const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const id = await options.internal.ensureFollowUpTask(
      leadId,
      `follow_up:${inquiryId}`,
      "Follow up on inquiry",
      due,
    );
    return { status: "succeeded", retryable: false, externalId: id ?? "existing" };
  }

  return {
    async deliver(
      integration: IntegrationName,
      event: AutomationEvent,
      contact: ContactContext,
    ): Promise<DeliveryResult> {
      if (integration === "internal") return internal(event);
      if (integration === "n8n") return n8n();
      if (integration === "hubspot") return hubspot(event, contact);
      if (integration === "resend") return resend(event, contact);
      if (integration === "resend_staff") return resendStaff(event, contact);
      return { status: "skipped", retryable: false, error: "unknown_integration" };
    },
  };
}

type HubResult = { ok: true; id: string } | { ok: false; result: DeliveryResult };

async function upsertHubspotContact(
  fetchImpl: FetchLike,
  config: IntegrationConfig,
  mappings: MappingStore,
  contact: ContactContext,
): Promise<HubResult> {
  const localId = contact.leadId || contact.inquiryId || contact.email || "";
  const existing = await mappings.get("hubspot", "contact", "lead", localId);
  const properties: Record<string, string> = { email: contact.email! };
  if (contact.name) {
    const [first, ...rest] = contact.name.split(" ");
    if (first) properties.firstname = first;
    if (rest.length) properties.lastname = rest.join(" ");
  }

  const body = JSON.stringify({
    inputs: [{ idProperty: "email", id: contact.email, properties }],
  });
  const response = await hubspotRequest(
    fetchImpl,
    config,
    "POST",
    "/crm/v3/objects/contacts/batch/upsert",
    body,
  );
  if (!response.ok) return { ok: false, result: response.result };
  const id = readHubspotId(response.json) || existing;
  if (!id) return { ok: false, result: { status: "failed", retryable: true, error: "hubspot_contact_id_missing" } };
  await mappings.put("hubspot", "contact", "lead", localId, id);
  return { ok: true, id };
}

async function upsertHubspotDeal(
  fetchImpl: FetchLike,
  config: IntegrationConfig,
  mappings: MappingStore,
  contact: ContactContext,
  contactId: string,
  event: AutomationEvent,
): Promise<HubResult> {
  const localId = contact.inquiryId || contact.leadId || event.id;
  const existing = await mappings.get("hubspot", "deal", "inquiry", localId);
  if (existing) {
    const stage = mappedStage(config, contact.leadStatus || String(event.payload.to_status ?? ""));
    const properties: Record<string, string> = {
      description: hubspotDealDescription(contact, event, config.siteUrl),
    };
    if (stage && config.hubspotPipelineId) {
      properties.dealstage = stage;
      properties.pipeline = config.hubspotPipelineId;
    }
    const patch = await hubspotRequest(
      fetchImpl,
      config,
      "PATCH",
      `/crm/v3/objects/deals/${existing}`,
      JSON.stringify({ properties }),
    );
    if (!patch.ok) return { ok: false, result: patch.result };
    return { ok: true, id: existing };
  }

  const summary = hubspotDealDescription(contact, event, config.siteUrl);
  const properties: Record<string, string> = {
    dealname: `FormShift · ${contact.vehicleSlug?.replace(/-/g, " ") ?? "General inquiry"}`,
    description: summary,
  };
  const stage = mappedStage(config, contact.leadStatus || "new");
  if (config.hubspotPipelineId) properties.pipeline = config.hubspotPipelineId;
  if (stage) properties.dealstage = stage;

  const create = await hubspotRequest(
    fetchImpl,
    config,
    "POST",
    "/crm/v3/objects/deals",
    JSON.stringify({
      properties,
      associations: [
        {
          to: { id: contactId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
        },
      ],
    }),
  );
  if (!create.ok) return { ok: false, result: create.result };
  const id = readHubspotId(create.json);
  if (!id) return { ok: false, result: { status: "failed", retryable: true, error: "hubspot_deal_id_missing" } };
  await mappings.put("hubspot", "deal", "inquiry", localId, id);
  return { ok: true, id };
}

function mappedStage(config: IntegrationConfig, status: string): string | null {
  return config.hubspotStages[status] || null;
}

function hubspotDealDescription(contact: ContactContext, event: AutomationEvent, siteUrl: string) {
  const parts = [
    "Source: FormShift AI digital studio",
    contact.inquiryId ? `Inquiry ID: ${contact.inquiryId}` : null,
    contact.leadId ? `Lead ID: ${contact.leadId}` : null,
    contact.vehicleSlug ? `Vehicle: ${contact.vehicleSlug}` : null,
    contact.message ? `Message: ${contact.message.slice(0, 500)}` : null,
    siteUrl && contact.leadId ? `Staff: ${siteUrl.replace(/\/$/, "")}/staff/leads/${contact.leadId}` : null,
    event.payload?.has_config === true ? "Includes 3D configuration snapshot." : null,
  ].filter(Boolean);
  return parts.join("\n");
}

function resendBlocked(event: AutomationEvent, config: IntegrationConfig): DeliveryResult | null {
  const invalid = validateEventPayload(event.event_type, event.payload);
  if (invalid) return { status: "failed", retryable: false, error: invalid };
  if (!config.resendApiKey || !config.resendFrom || !validEmail(config.resendFrom)) {
    return { status: "skipped", retryable: false, error: "resend_not_configured" };
  }
  if (config.dryRun) return { status: "skipped", retryable: false, error: "dry_run" };
  return null;
}

async function hubspotRequest(
  fetchImpl: FetchLike,
  config: IntegrationConfig,
  method: string,
  path: string,
  body?: string,
): Promise<{ ok: true; json: unknown } | { ok: false; result: DeliveryResult }> {
  try {
    const response = await fetchImpl(`https://api.hubapi.com${path}`, {
      method,
      headers: {
        authorization: `Bearer ${config.hubspotToken}`,
        "content-type": "application/json",
      },
      body,
    });
    const text = await response.text();
    if (response.status === 401 || response.status === 403) {
      return { ok: false, result: { status: "failed", retryable: false, error: `hubspot_auth_${response.status}` } };
    }
    const parsed = safeJson(text);
    if (response.status >= 200 && response.status < 300) return { ok: true, json: parsed };
    return { ok: false, result: resultFromHttp(response.status, safeLogMessage(text).slice(0, 200)) };
  } catch (error) {
    return { ok: false, result: networkFailure(error) };
  }
}

function readHubspotId(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  if (typeof root.id === "string") return root.id;
  const results = root.results;
  if (Array.isArray(results) && results[0] && typeof results[0] === "object") {
    const first = results[0] as Record<string, unknown>;
    if (typeof first.id === "string") return first.id;
  }
  return null;
}

function resendDeliveryResult(status: number, text: string, externalId?: string): DeliveryResult {
  if (status >= 200 && status < 300) {
    return { status: "succeeded", retryable: false, externalId };
  }
  const safe = safeLogMessage(text).slice(0, 180);
  const lower = safe.toLowerCase();
  if (lower.includes("only send testing emails") || lower.includes("own email address")) {
    return { status: "failed", retryable: false, error: "resend_recipient_not_permitted" };
  }
  if (lower.includes("not verified") || lower.includes("verify a domain")) {
    return { status: "failed", retryable: false, error: "resend_domain_not_verified" };
  }
  return resultFromHttp(status, safe, externalId);
}

async function sendResend(
  fetchImpl: FetchLike,
  config: IntegrationConfig,
  to: string,
  message: { subject: string; text: string; html: string },
): Promise<DeliveryResult> {
  try {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: config.resendFrom,
        to: [to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    const text = await response.text();
    const json = safeJson(text) as { id?: string } | null;
    const externalId = json && typeof json.id === "string" ? json.id : undefined;
    return resendDeliveryResult(response.status, text, externalId);
  } catch (error) {
    return networkFailure(error);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
