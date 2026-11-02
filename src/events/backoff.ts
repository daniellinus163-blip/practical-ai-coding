const BASE_MS = 30_000;
const CAP_MS = 60 * 60 * 1000;
export const MAX_ATTEMPTS = 8;

export function backoffMs(attemptCount: number): number {
  const exp = Math.max(0, attemptCount - 1);
  return Math.min(CAP_MS, BASE_MS * 2 ** exp);
}

export function isRetryableStatus(httpStatus: number): boolean {
  return httpStatus === 408 || httpStatus === 429 || httpStatus >= 500;
}

export function isPermanentStatus(httpStatus: number): boolean {
  return httpStatus >= 400 && httpStatus < 500 && httpStatus !== 408 && httpStatus !== 429;
}
