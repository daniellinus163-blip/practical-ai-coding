"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";

type ReplyState = { error: string | null; success: string | null };

export async function submitCustomerInquiryReplyAction(
  _prev: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const empty: ReplyState = { error: null, success: null };
  const user = await getAuthUser();
  if (!user) return { ...empty, error: "Sign in to reply." };

  const inquiryId = String(formData.get("inquiryId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(inquiryId)) return { ...empty, error: "Invalid inquiry." };
  if (message.length < 10 || message.length > 4000) {
    return { ...empty, error: "Message must be 10–4000 characters." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ...empty, error: "Could not connect." };

  const { data, error } = await supabase.rpc("record_customer_inquiry_reply", {
    p_inquiry_id: inquiryId,
    p_message: message,
  });

  if (error) {
    const msg =
      error.message.includes("not allowed") || error.message.includes("not authenticated")
        ? "You can only reply to inquiries on your account."
        : error.message;
    return { ...empty, error: msg };
  }

  revalidatePath("/account/inquiries");
  revalidatePath("/staff/leads");
  if (data && typeof data === "object" && "lead_id" in data && typeof data.lead_id === "string") {
    revalidatePath(`/staff/leads/${data.lead_id}`);
  }

  return {
    error: null,
    success: "Reply sent. Our team will see it on your lead conversation.",
  };
}

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
