import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bucketCountsByUtcDay,
  countBySlug,
  formatDurationMs,
  lastUtcDayKeys,
  medianFirstResponseMs,
} from "./command-center-buckets";

describe("command-center-buckets", () => {
  it("builds consecutive UTC day keys", () => {
    const keys = lastUtcDayKeys(3, new Date("2026-03-10T15:00:00.000Z"));
    assert.deepEqual(keys, ["2026-03-08", "2026-03-09", "2026-03-10"]);
  });

  it("buckets inquiry timestamps into day counts", () => {
    const keys = ["2026-03-09", "2026-03-10"];
    const buckets = bucketCountsByUtcDay(
      ["2026-03-09T10:00:00.000Z", "2026-03-09T22:00:00.000Z", "2026-03-10T01:00:00.000Z"],
      keys,
    );
    assert.deepEqual(buckets, [
      { day: "2026-03-09", count: 2 },
      { day: "2026-03-10", count: 1 },
    ]);
  });

  it("counts vehicle slugs", () => {
    const top = countBySlug([
      { slug: "sedan-a" },
      { slug: "suv-b" },
      { slug: "sedan-a" },
      { slug: null },
    ]);
    assert.deepEqual(top, [
      { slug: "sedan-a", count: 2 },
      { slug: "suv-b", count: 1 },
    ]);
  });

  it("computes median first response", () => {
    const { medianMs, sampleSize } = medianFirstResponseMs([
      { leadCreatedAt: "2026-01-01T00:00:00.000Z", firstStaffReplyAt: "2026-01-01T02:00:00.000Z" },
      { leadCreatedAt: "2026-01-02T00:00:00.000Z", firstStaffReplyAt: "2026-01-02T04:00:00.000Z" },
    ]);
    assert.equal(sampleSize, 2);
    assert.equal(medianMs, 3 * 60 * 60 * 1000);
  });

  it("formats duration for display", () => {
    assert.equal(formatDurationMs(45 * 60_000), "45 min");
    assert.equal(formatDurationMs(5 * 3_600_000), "5 hr");
    assert.equal(formatDurationMs(null), null);
  });
});
