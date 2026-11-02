import { getSupabaseUrl } from "@/lib/supabase/env";

export function profileInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name || email || "FS").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "F") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "S");
  return letters.toUpperCase().slice(0, 2);
}

export function avatarPublicUrl(path: string | null | undefined, updatedAt?: string | null) {
  if (!path) return null;
  const base = getSupabaseUrl().replace(/\/$/, "");
  if (!base) return null;
  const url = `${base}/storage/v1/object/public/avatars/${path}`;
  return updatedAt ? `${url}?v=${encodeURIComponent(updatedAt)}` : url;
}

export function profileCompleteness(profile: {
  displayName: string;
  phone: string;
  country: string;
  city: string;
  hasAvatar?: boolean;
}) {
  const checks = [
    { id: "photo", label: "Profile photo", done: Boolean(profile.hasAvatar) },
    { id: "name", label: "Display name", done: profile.displayName.trim().length >= 2 },
    { id: "country", label: "Country", done: profile.country.trim().length > 0 },
    { id: "city", label: "City", done: profile.city.trim().length > 0 },
    { id: "phone", label: "Phone", done: profile.phone.trim().length >= 5 },
  ];
  const done = checks.filter((item) => item.done).length;
  return { checks, done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
}
