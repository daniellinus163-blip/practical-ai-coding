const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validEmail(value: string) {
  return EMAIL.test(value) && value.length <= 160;
}

export function validName(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 80;
}

export function validMessage(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 10 && trimmed.length <= 4000;
}

export function validPhone(value: string | null) {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed.length >= 5 && trimmed.length <= 32;
}

export function safeNextPath(value: string | null | undefined, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return fallback;
  }
  return value;
}
