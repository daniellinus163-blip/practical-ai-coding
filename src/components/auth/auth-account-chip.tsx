"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AvatarMark } from "@/components/account/avatar-mark";
import { AVATAR_PREVIEW_EVENT } from "@/lib/avatar-preview";

export function AuthAccountChip({
  displayName,
  email,
  avatarUrl,
}: {
  displayName: string;
  email: string;
  avatarUrl: string | null;
}) {
  const [src, setSrc] = useState(avatarUrl);

  useEffect(() => {
    setSrc(avatarUrl);
  }, [avatarUrl]);

  useEffect(() => {
    const onPreview = (event: Event) => {
      const next = (event as CustomEvent<string | null>).detail;
      setSrc(next);
    };
    window.addEventListener(AVATAR_PREVIEW_EVENT, onPreview);
    return () => window.removeEventListener(AVATAR_PREVIEW_EVENT, onPreview);
  }, []);

  return (
    <Link
      href="/account"
      className="flex items-center gap-2 text-[var(--ink)] hover:text-[var(--brass)]"
      title="Account"
    >
      <AvatarMark name={displayName} email={email} src={src} size={32} />
      <span className="text-sm">Account</span>
    </Link>
  );
}
