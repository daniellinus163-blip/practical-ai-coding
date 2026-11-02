"use server";

import { revalidatePath } from "next/cache";
import { catalogRepository } from "@/catalog/local-repository";
import { getVehicle3DAsset } from "@/configurator/manifest";
import { sanitizePublicConfig, type PublicVehicleConfig } from "@/configurator/saved-config";
import { runEventWorker } from "@/events/run";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";

export type SaveBuildState = { error: string | null; success: string | null; id?: string };

function parsePayload(raw: string, vehicle: { id: string; slug: string }): PublicVehicleConfig | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return sanitizePublicConfig(parsed, vehicle, getVehicle3DAsset(vehicle.slug));
}

export async function saveConfigurationAction(
  _prev: SaveBuildState,
  formData: FormData,
): Promise<SaveBuildState> {
  if (!isSupabaseConfigured()) {
    return { error: "Saving to an account needs Supabase to be configured.", success: null };
  }
  const user = await getAuthUser();
  if (!user) return { error: "Sign in to save this configuration to your account.", success: null };

  const vehicleSlug = String(formData.get("vehicleSlug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || "Studio build";
  const vehicle = await catalogRepository.getVehicleBySlug(vehicleSlug);
  if (!vehicle) return { error: "Unknown vehicle.", success: null };
  if (name.length > 80) return { error: "Name must be 80 characters or fewer.", success: null };

  const payload = parsePayload(String(formData.get("payload") ?? ""), vehicle);
  if (!payload) return { error: "Configuration payload is invalid.", success: null };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured on this server yet.", success: null };

  const { data, error } = await supabase.rpc("record_saved_configuration", {
    p_id: null,
    p_vehicle_slug: vehicle.slug,
    p_catalog_vehicle_id: vehicle.id,
    p_name: name,
    p_payload: payload,
    p_schema_version: payload.schemaVersion,
  });
  if (error || !data) return { error: error?.message ?? "Could not save the configuration.", success: null };
  void runEventWorker("after-save").catch(() => {});
  revalidatePath("/my-builds");
  revalidatePath("/account");
  const id = typeof data === "object" && data && "id" in data ? String((data as { id: string }).id) : undefined;
  return { error: null, success: "Saved to My Builds.", id };
}

export async function updateConfigurationAction(
  _prev: SaveBuildState,
  formData: FormData,
): Promise<SaveBuildState> {
  if (!isSupabaseConfigured()) {
    return { error: "Saving to an account needs Supabase to be configured.", success: null };
  }
  const user = await getAuthUser();
  if (!user) return { error: "Sign in to update this configuration.", success: null };

  const id = String(formData.get("id") ?? "").trim();
  const vehicleSlug = String(formData.get("vehicleSlug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || "Studio build";
  if (!id) return { error: "Missing saved build.", success: null };
  const vehicle = await catalogRepository.getVehicleBySlug(vehicleSlug);
  if (!vehicle) return { error: "Unknown vehicle.", success: null };

  const payload = parsePayload(String(formData.get("payload") ?? ""), vehicle);
  if (!payload) return { error: "Configuration payload is invalid.", success: null };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured on this server yet.", success: null };

  const { error } = await supabase.rpc("record_saved_configuration", {
    p_id: id,
    p_vehicle_slug: vehicle.slug,
    p_catalog_vehicle_id: vehicle.id,
    p_name: name,
    p_payload: payload,
    p_schema_version: payload.schemaVersion,
  });
  if (error) return { error: error.message, success: null };
  void runEventWorker("after-save").catch(() => {});
  revalidatePath("/my-builds");
  revalidatePath("/account");
  return { error: null, success: "Build updated." };
}

export async function deleteConfigurationAction(formData: FormData) {
  const user = await getAuthUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  await supabase.from("saved_configurations").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/my-builds");
  revalidatePath("/account");
}
