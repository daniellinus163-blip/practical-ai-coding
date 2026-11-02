import { profileInitials } from "@/lib/profile";

export function AvatarMark({
  name,
  email,
  src,
  size = 56,
}: {
  name: string;
  email: string;
  src?: string | null;
  size?: number;
}) {
  const initials = profileInitials(name, email);
  return (
    <div
      className="relative shrink-0 overflow-hidden bg-[var(--ink)]"
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-display text-[var(--hero-text)]"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
