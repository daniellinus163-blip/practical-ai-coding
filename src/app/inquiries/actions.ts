"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { catalogRepository } from "@/catalog/local-repository";
import { getVehicle3DAsset } from "@/configurator/manifest";
import { sanitizePublicConfig } from "@/configurator/saved-config";
import { safeLogMessage } from "@/events/log";
import { runEventWorker } from "@/events/run";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";
import { validEmail, validMessage, validName } from "@/lib/validation";

export type InquiryState = { error: string | null; success: string | null };

export async function submitInquiryAction(
  _prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  if (!isSupabaseConfigured()) {
    return { error: "Inquiries need Supabase to be configured on this server.", success: null };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const message = String(formData.get("message") ?? "").trim();
  const vehicleSlug = String(formData.get("vehicleSlug") ?? "").trim() || null;
  const claimedUserId = String(formData.get("userId") ?? "");
  const configurationIdRaw = String(formData.get("configurationId") ?? "").trim();
  const configurationId = /^[0-9a-f-]{36}$/i.test(configurationIdRaw) ? configurationIdRaw : null;

  if (claimedUserId) return { error: "Invalid submission.", success: null };
  if (!validName(name) || !validEmail(email) || !validMessage(message)) {
    return { error: "Check name, email, and a message of at least 10 characters.", success: null };
  }

  let vehicle = null;
  if (vehicleSlug) {
    vehicle = await catalogRepository.getVehicleBySlug(vehicleSlug);
    if (!vehicle) return { error: "Unknown vehicle.", success: null };
  }

  let parsedConfig: unknown = {};
  try {
    parsedConfig = JSON.parse(String(formData.get("configuration") || "{}"));
  } catch {
    parsedConfig = {};
  }
  const snapshot = vehicle
    ? sanitizePublicConfig(parsedConfig, vehicle, getVehicle3DAsset(vehicle.slug))
    : null;

  const hash = createHash("sha256")
    .update(`${email}|${vehicleSlug ?? ""}|${JSON.stringify(snapshot)}`)
    .digest("hex");

  const user = await getAuthUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured on this server yet.", success: null };

  const { data, error } = await supabase.rpc("record_inquiry", {
    p_name: name,
    p_email: email,
    p_message: message,
    p_vehicle_slug: vehicleSlug,
    p_configuration_id: configurationId,
    p_configuration_snapshot: snapshot,
    p_submission_hash: hash,
    p_user_id: user?.id ?? null,
  });
  if (error || !data) {
    return { error: error?.message ?? "Could not save the inquiry.", success: null };
  }

  const result = data as { duplicate?: boolean };
  void runEventWorker("after-inquiry").catch((error) => {
    const message = error instanceof Error ? error.message : "worker_failed";
    console.error("[events]", safeLogMessage(message));
  });

  revalidatePath("/account/inquiries");
  revalidatePath("/account");
  revalidatePath("/staff");
  if (result.duplicate) {
    return {
      error: null,
      success: "This inquiry was already received. We did not create a duplicate.",
    };
  }
  return {
    error: null,
    success: "Inquiry received. This is not an order or a manufacturer reservation.",
  };
}
