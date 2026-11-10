"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isListedCountry } from "@/lib/countries";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";
import { safeNextPath, validEmail, validName, validPhone } from "@/lib/validation";

type AuthState = { error: string | null; success: string | null };

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured on this server yet.", success: null };
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/account"));
  if (!validEmail(email) || password.length < 8) {
    return { error: "Enter a valid email and a password of at least 8 characters.", success: null };
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured on this server yet.", success: null };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message, success: null };
  redirect(next);
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured on this server yet.", success: null };
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!validEmail(email) || password.length < 8 || !validName(displayName)) {
    return {
      error: "Use a real email, a display name, and a password of at least 8 characters.",
      success: null,
    };
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured on this server yet.", success: null };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/account`,
    },
  });
  if (error) return { error: error.message, success: null };
  if (!data.session) {
    return {
      error: null,
      success: "Check your email to confirm the account, then sign in.",
    };
  }
  redirect("/account");
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured on this server yet.", success: null };
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!validEmail(email)) return { error: "Enter a valid email address.", success: null };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured on this server yet.", success: null };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/auth/update-password`,
  });
  if (error) return { error: error.message, success: null };
  return {
    error: null,
    success: "If that email is registered, a reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", success: null };
  }
  const user = await getAuthUser();
  if (!user) return { error: "Sign in from the reset email link first.", success: null };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured on this server yet.", success: null };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message, success: null };
  redirect("/account");
}

export async function updateProfileAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const user = await getAuthUser();
  if (!user) return { error: "Sign in to update your profile.", success: null };
  const displayName = String(formData.get("displayName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const preferredContact = String(formData.get("preferredContact") ?? "email").trim();
  if (!validName(displayName)) return { error: "Display name must be 2–80 characters.", success: null };
  if (!validPhone(phone)) return { error: "Phone must be 5–32 characters if provided.", success: null };
  if (country && country.length > 80) return { error: "Country is too long.", success: null };
  if (country && !isListedCountry(country) && country.length < 2) {
    return { error: "Choose a valid country.", success: null };
  }
  if (city && (city.length < 1 || city.length > 80)) return { error: "City must be 80 characters or fewer.", success: null };
  if (preferredContact !== "email" && preferredContact !== "phone") {
    return { error: "Choose email or phone as preferred contact.", success: null };
  }
  if (preferredContact === "phone" && !phone) {
    return { error: "Add a phone number to prefer phone contact.", success: null };
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured on this server yet.", success: null };
  const { error } = await supabase.from("customer_profiles").upsert({
    id: user.id,
    display_name: displayName,
    phone,
    country,
    city,
    preferred_contact: preferredContact,
  });
  if (error) return { error: error.message, success: null };
  await supabase.auth.updateUser({ data: { display_name: displayName } });
  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { error: null, success: "Profile saved." };
}

export async function updatePasswordFromAccountAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const user = await getAuthUser();
  if (!user?.email) return { error: "Sign in to change your password.", success: null };
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (currentPassword.length < 8 || password.length < 8) {
    return { error: "Passwords must be at least 8 characters.", success: null };
  }
  if (password !== confirmPassword) return { error: "New passwords do not match.", success: null };
  if (password === currentPassword) {
    return { error: "Choose a password that is different from the current one.", success: null };
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured on this server yet.", success: null };
  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (checkError) return { error: "Current password is incorrect.", success: null };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message, success: null };
  revalidatePath("/account/profile");
  return { error: null, success: "Password updated." };
}
