import { loadIntegrationConfig } from "@/events/config";
import { sanitizePayload } from "@/events/payload";
import { verifySignature } from "@/events/signature";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = loadIntegrationConfig();
  const raw = await request.text();
  if (!config.webhookSecret || !verifySignature(config.webhookSecret, raw, request.headers.get("x-formshift-signature"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!parsed || typeof parsed !== "object") return Response.json({ error: "invalid_payload" }, { status: 400 });
  const body = parsed as Record<string, unknown>;
  const eventId = typeof body.event_id === "string" ? body.event_id : "";
  const integration =
    body.integration === "n8n" ||
    body.integration === "hubspot" ||
    body.integration === "resend" ||
    body.integration === "resend_staff"
      ? body.integration
      : null;
  const status = body.status === "succeeded" || body.status === "failed" || body.status === "skipped" ? body.status : null;
  if (!eventId || !integration || !status) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return Response.json({ error: "unavailable" }, { status: 503 });

  const safe = sanitizePayload(body);
  const { error } = await admin
    .from("automation_event_deliveries")
    .update({
      status,
      last_error: status === "failed" ? String(safe.error ?? "provider_ack").slice(0, 400) : null,
      external_id: typeof body.external_id === "string" ? body.external_id.slice(0, 120) : null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId)
    .eq("integration", integration);

  if (error) return Response.json({ error: "update_failed" }, { status: 500 });
  return Response.json({ ok: true });
}
