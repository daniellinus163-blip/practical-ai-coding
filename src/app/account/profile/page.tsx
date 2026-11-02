import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { AvatarForm } from "@/components/account/avatar-form";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { SetupNotice } from "@/components/auth/setup-notice";
import { EmptyState } from "@/components/catalog/empty-state";
import { avatarPublicUrl } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";
import { getStaffRole } from "@/lib/supabase/staff";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 text-sm">Loading profile…</div>}>
      <ProfileBody />
    </Suspense>
  );
}

async function ProfileBody() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-12">
        <h1 className="font-display text-4xl">Profile</h1>
        <SetupNotice />
        <EmptyState title="Profiles are offline" body="Add Supabase keys to manage your details." />
      </div>
    );
  }

  const user = await getAuthUser();
  if (!user) redirect("/login?next=/account/profile");

  const supabase = await createServerSupabaseClient();
  const [profileResult, role] = await Promise.all([
    supabase
      ? supabase
          .from("customer_profiles")
          .select("display_name, phone, country, city, preferred_contact, avatar_path, updated_at")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: { message: "Client unavailable" } }),
    getStaffRole(),
  ]);

  const preferred =
    profileResult.data?.preferred_contact === "phone" ? "phone" : "email";
  const avatarUrl = avatarPublicUrl(
    profileResult.data?.avatar_path,
    profileResult.data?.updated_at,
  );

  return (
    <AccountShell
      currentPath="/account/profile"
      displayName={profileResult.data?.display_name ?? ""}
      email={user.email ?? ""}
      avatarUrl={avatarUrl}
      staffHref={role ? "/staff" : null}
    >
      <div className="space-y-8">
        {profileResult.error ? <p className="text-sm text-[var(--danger)]">{profileResult.error.message}</p> : null}

        <AvatarForm
          displayName={profileResult.data?.display_name ?? ""}
          email={user.email ?? ""}
          avatarUrl={avatarUrl}
        />

        <section className="border border-[var(--line)] bg-[var(--bg-2)] p-5 text-sm">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">Sign-in email</p>
          <p className="mt-2 text-lg text-[var(--ink)]">{user.email}</p>
          <p className="mt-2 text-[var(--muted)]">
            Email cannot be edited here. It is the identifier for this account.
            {user.email_confirmed_at ? " This address is confirmed." : " Confirm this address from the email we sent."}
          </p>
        </section>

        <ProfileForm
          displayName={profileResult.data?.display_name ?? ""}
          phone={profileResult.data?.phone ?? ""}
          country={profileResult.data?.country ?? ""}
          city={profileResult.data?.city ?? ""}
          preferredContact={preferred}
        />

        <PasswordForm />
      </div>
    </AccountShell>
  );
}
