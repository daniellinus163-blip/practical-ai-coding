import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthUser } from "@/lib/supabase/server";
import { getStaffRole, type StaffRole } from "@/lib/supabase/staff";

export type StaffContext = {
  userId: string;
  email: string | undefined;
  role: StaffRole;
  admin: SupabaseClient | null;
  serviceRole: boolean;
};

export async function requireStaff(nextPath = "/staff"): Promise<StaffContext> {
  await connection();
  if (!isSupabaseConfigured()) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  const user = await getAuthUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  const role = await getStaffRole();
  if (!role) redirect("/staff-denied");
  return {
    userId: user.id,
    email: user.email,
    role,
    admin: createAdminSupabaseClient(),
    serviceRole: isServiceRoleConfigured(),
  };
}

export async function listStaffDirectory(admin: SupabaseClient) {
  const { data } = await admin
    .from("staff_members")
    .select("user_id, role, display_name, email")
    .order("created_at", { ascending: true });
  return data ?? [];
}
