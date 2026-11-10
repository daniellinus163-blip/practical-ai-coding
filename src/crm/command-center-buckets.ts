export type DayCount = { day: string; count: number };

export function startOfUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Last `days` UTC dates ending today (inclusive), oldest first. */
export function lastUtcDayKeys(days: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    keys.push(startOfUtcDay(d));
  }
  return keys;
}

export function bucketCountsByUtcDay(
  timestamps: string[],
  dayKeys: string[],
): DayCount[] {
  const counts = new Map<string, number>();
  for (const key of dayKeys) counts.set(key, 0);
  for (const raw of timestamps) {
    const key = startOfUtcDay(new Date(raw));
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return dayKeys.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}

export type SlugCount = { slug: string; count: number };

export function countBySlug(rows: Array<{ slug: string | null }>, limit = 8): SlugCount[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const slug = row.slug?.trim();
    if (!slug) continue;
    map.set(slug, (map.get(slug) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type FirstResponseSample = { leadCreatedAt: string; firstStaffReplyAt: string };

/**
 * Median first-response time in ms from staff `customer_follow_up` vs lead `created_at`.
 * Returns null when there are no valid samples.
 */
export function medianFirstResponseMs(samples: FirstResponseSample[]): {
  medianMs: number | null;
  sampleSize: number;
} {
  const deltas: number[] = [];
  for (const row of samples) {
    const start = new Date(row.leadCreatedAt).getTime();
    const end = new Date(row.firstStaffReplyAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) continue;
    deltas.push(end - start);
  }
  if (deltas.length === 0) return { medianMs: null, sampleSize: 0 };
  deltas.sort((a, b) => a - b);
  const mid = Math.floor(deltas.length / 2);
  const medianMs =
    deltas.length % 2 === 1 ? deltas[mid]! : Math.round((deltas[mid - 1]! + deltas[mid]!) / 2);
  return { medianMs, sampleSize: deltas.length };
}

export function formatDurationMs(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 90) return `${minutes} min`;
  const hours = Math.round(ms / 3_600_000);
  if (hours < 48) return `${hours} hr`;
  const days = Math.round(ms / 86_400_000);
  return `${days} d`;
}
