"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";

type AvatarState = { error: string | null; success: string | null };

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function refreshAccount() {
  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/account/profile");
  revalidatePath("/account/inquiries");
  revalidatePath("/my-builds");
}

export async function uploadAvatarAction(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const user = await getAuthUser();
  if (!user) return { error: "Sign in to upload a photo.", success: null };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured on this server yet.", success: null };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a JPEG, PNG, or WebP photo.", success: null };
  }
  if (file.size > MAX_BYTES) return { error: "Photo must be 2 MB or smaller.", success: null };
  const ext = TYPES[file.type];
  if (!ext) return { error: "Use a JPEG, PNG, or WebP image.", success: null };

  const path = `${user.id}/avatar.${ext}`;
  const { data: existing } = await supabase
    .from("customer_profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.avatar_path && existing.avatar_path !== path) {
    await supabase.storage.from("avatars").remove([existing.avatar_path]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) return { error: uploadError.message, success: null };

  const { error } = await supabase.from("customer_profiles").upsert({
    id: user.id,
    avatar_path: path,
  });
  if (error) return { error: error.message, success: null };
  refreshAccount();
  return { error: null, success: "Photo updated." };
}

export async function removeAvatarAction(
  _prev: AvatarState,
  _formData: FormData,
): Promise<AvatarState> {
  const user = await getAuthUser();
  if (!user) return { error: "Sign in to remove your photo.", success: null };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured on this server yet.", success: null };

  const { data } = await supabase.from("customer_profiles").select("avatar_path").eq("id", user.id).maybeSingle();
  if (data?.avatar_path) {
    await supabase.storage.from("avatars").remove([data.avatar_path]);
  }
  const { error } = await supabase.from("customer_profiles").update({ avatar_path: null }).eq("id", user.id);
  if (error) return { error: error.message, success: null };
  refreshAccount();
  return { error: null, success: "Photo removed. Initials will show instead." };
}
