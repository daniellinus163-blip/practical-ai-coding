import { createHmac, timingSafeEqual } from "crypto";

export function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifySignature(secret: string, body: string, header: string | null): boolean {
  if (!secret || !header) return false;
  const provided = header.replace(/^sha256=/i, "").trim();
  if (!/^[0-9a-f]+$/i.test(provided)) return false;
  const expected = signPayload(secret, body);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function timingSafeStringEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
