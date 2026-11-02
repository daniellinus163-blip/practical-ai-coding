export const AVATAR_PREVIEW_EVENT = "formshift-avatar-preview";

export function publishAvatarPreview(url: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AVATAR_PREVIEW_EVENT, { detail: url }));
}
