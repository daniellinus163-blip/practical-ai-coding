import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";

export type StaffRole = "staff" | "admin";

export async function getStaffRole(): Promise<StaffRole | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const userClient = await createServerSupabaseClient();
  if (userClient) {
    const { data } = await userClient
      .from("staff_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.role === "staff" || data?.role === "admin") return data.role;
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("staff_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  if (data.role === "staff" || data.role === "admin") return data.role;
  return null;
}
