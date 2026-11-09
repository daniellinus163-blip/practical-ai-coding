"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";

export async function markInquiryNotificationsReadAction(formData: FormData) {
  const inquiryId = String(formData.get("inquiryId") ?? "");
  const user = await getAuthUser();
  if (!user || !/^[0-9a-f-]{36}$/i.test(inquiryId)) return;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  await supabase
    .from("customer_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("inquiry_id", inquiryId)
    .is("read_at", null);
  revalidatePath("/account/inquiries");
}
