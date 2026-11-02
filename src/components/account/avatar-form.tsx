"use client";

import { useActionState, useEffect, useState } from "react";
import { removeAvatarAction, uploadAvatarAction } from "@/app/account/avatar-actions";
import { AvatarMark } from "@/components/account/avatar-mark";
import { publishAvatarPreview } from "@/lib/avatar-preview";

export function AvatarForm({
  displayName,
  email,
  avatarUrl,
}: {
  displayName: string;
  email: string;
  avatarUrl: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadState, uploadAction, uploading] = useActionState(uploadAvatarAction, {
    error: null,
    success: null,
  });
  const [removeState, removeAction, removing] = useActionState(removeAvatarAction, {
    error: null,
    success: null,
  });

  useEffect(() => {
    publishAvatarPreview(preview ?? avatarUrl);
    return () => {
      publishAvatarPreview(avatarUrl);
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview, avatarUrl]);

  return (
    <section className="border border-[var(--line)] bg-[var(--card)] p-6">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">Photo</p>
      <h2 className="font-display mt-1 text-2xl">Profile picture</h2>
      <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
        JPEG, PNG, or WebP, up to 2 MB. This is your account photo, not a manufacturer image.
      </p>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <AvatarMark name={displayName} email={email} src={preview ?? avatarUrl} size={96} />
        <div className="space-y-3">
          <form action={uploadAction} className="flex flex-wrap items-center gap-3">
            <input
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (preview) URL.revokeObjectURL(preview);
                const next = file ? URL.createObjectURL(file) : null;
                setPreview(next);
                publishAvatarPreview(next ?? avatarUrl);
              }}
              className="text-sm"
            />
            <button
              type="submit"
              disabled={uploading}
              className="on-dark bg-[var(--ink)] px-4 py-2 text-sm disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Upload photo"}
            </button>
          </form>
          {avatarUrl ? (
            <form action={removeAction}>
              <button
                type="submit"
                disabled={removing}
                className="border border-[var(--line)] px-4 py-2 text-sm disabled:opacity-60"
              >
                {removing ? "Removing…" : "Remove photo"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
      {uploadState.error || removeState.error ? (
        <p className="mt-3 text-sm text-[var(--danger)]">{uploadState.error || removeState.error}</p>
      ) : null}
      {uploadState.success || removeState.success ? (
        <p className="mt-3 text-sm text-[var(--ink)]">{uploadState.success || removeState.success}</p>
      ) : null}
    </section>
  );
}
