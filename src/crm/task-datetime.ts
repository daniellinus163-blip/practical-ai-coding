/** Combine HTML date + time into ISO timestamptz (UTC). Empty time → start of day UTC. */
export function parseTaskDueAt(dateRaw: string, timeRaw: string): string | null {
  const date = dateRaw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = timeRaw.trim();
  if (!time) return `${date}T00:00:00.000Z`;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) return null;
  const normalized = time.length === 5 ? `${time}:00` : time;
  return `${date}T${normalized}.000Z`;
}

export function formatTaskDueAt(value: string | null): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return { date, time };
}
