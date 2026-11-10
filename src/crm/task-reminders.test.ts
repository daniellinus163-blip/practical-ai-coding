import assert from "node:assert/strict";
import test from "node:test";
import { parseTaskDueAt } from "@/crm/task-datetime";

test("parseTaskDueAt combines date and time", () => {
  assert.equal(parseTaskDueAt("2026-11-15", "14:30"), "2026-11-15T14:30:00.000Z");
  assert.equal(parseTaskDueAt("2026-11-15", ""), "2026-11-15T00:00:00.000Z");
});

test("parseTaskDueAt rejects invalid date", () => {
  assert.equal(parseTaskDueAt("15-11-2026", "10:00"), null);
});
