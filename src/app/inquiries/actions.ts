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

export type InquiryState = {
  error: string | null;
  success: string | null;
  referenceId: string | null;
  signedIn: boolean;
};

export async function submitInquiryAction(
  _prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const empty: InquiryState = { error: null, success: null, referenceId: null, signedIn: false };

  if (!isSupabaseConfigured()) {
    return { ...empty, error: "Inquiries need Supabase to be configured on this server." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const message = String(formData.get("message") ?? "").trim();
  const vehicleSlug = String(formData.get("vehicleSlug") ?? "").trim() || null;
  const claimedUserId = String(formData.get("userId") ?? "");
  const configurationIdRaw = String(formData.get("configurationId") ?? "").trim();
  const configurationId = /^[0-9a-f-]{36}$/i.test(configurationIdRaw) ? configurationIdRaw : null;

  if (claimedUserId) return { ...empty, error: "Invalid submission." };
  if (!validName(name) || !validEmail(email) || !validMessage(message)) {
    return { ...empty, error: "Check name, email, and a message of at least 10 characters." };
  }

  let vehicle = null;
  if (vehicleSlug) {
    vehicle = await catalogRepository.getVehicleBySlug(vehicleSlug);
    if (!vehicle) return { ...empty, error: "Unknown vehicle." };
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
  if (!supabase) return { ...empty, error: "Supabase is not configured on this server yet." };

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
    return { ...empty, error: error?.message ?? "Could not save the inquiry." };
  }

  const result = data as { duplicate?: boolean; inquiry_id?: string };
  const referenceId = result.inquiry_id ?? null;

  try {
    const worker = await runEventWorker("after-inquiry");
    if (worker.error) {
      console.error("[events]", safeLogMessage(worker.error));
    }
  } catch (workerError) {
    const message = workerError instanceof Error ? workerError.message : "worker_failed";
    console.error("[events]", safeLogMessage(message));
  }

  revalidatePath("/account/inquiries");
  revalidatePath("/account");
  revalidatePath("/staff");

  const signedIn = Boolean(user?.id);

  if (result.duplicate) {
    return {
      error: null,
      success:
        "We already have this inquiry on file. A duplicate was not created. Check your email for an earlier confirmation.",
      referenceId,
      signedIn,
    };
  }

  return {
    error: null,
    success: signedIn
      ? "Your inquiry is in our CRM pipeline. A confirmation email is on its way to your inbox, and you can track it under Account → Inquiries."
      : "Your inquiry is in our CRM pipeline. A confirmation email is on its way — sign in with the same email to see it under Account → Inquiries.",
    referenceId,
    signedIn,
  };
}
