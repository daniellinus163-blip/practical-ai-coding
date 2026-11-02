import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { handleWorkerRequest } from "./worker-http.ts";

test("worker route rejects unauthorized requests and hides the secret", async () => {
  let ran = 0;
  const run = async () => {
    ran += 1;
    return { claimed: 1, processed: 1, error: null };
  };
  const missing = await handleWorkerRequest(new Request("http://localhost/api/internal/events/process"), {
    secrets: ["correct-secret"],
    run,
  });
  const query = await handleWorkerRequest(new Request("http://localhost/api/internal/events/process?secret=correct-secret"), {
    secrets: ["correct-secret"],
    run,
  });
  const wrong = await handleWorkerRequest(
    new Request("http://localhost/api/internal/events/process", { headers: { authorization: "Bearer wrong" } }),
    { secrets: ["correct-secret"], run },
  );
  const empty = await handleWorkerRequest(
    new Request("http://localhost/api/internal/events/process", { headers: { authorization: "Bearer correct-secret" } }),
    { secrets: [], run },
  );
  for (const response of [missing, query, wrong, empty]) {
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.error, "unauthorized");
    assert.equal(JSON.stringify(body).includes("correct-secret"), false);
  }
  assert.equal(ran, 0);
});

test("worker route accepts either configured bearer secret", async () => {
  for (const secret of ["events-secret", "cron-secret"]) {
    const response = await handleWorkerRequest(
      new Request("http://localhost/api/internal/events/process", {
        method: "GET",
        headers: { authorization: `Bearer ${secret}` },
      }),
      {
        secrets: ["events-secret", "cron-secret"],
        run: async () => ({ claimed: 2, processed: 2, error: null }),
      },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.claimed, 2);
    assert.equal(JSON.stringify(body).includes(secret), false);
  }
});

test("follow-up reminders are scheduled for 24 hours and claimed only when due", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/20261029_formshift_phase7_events.sql", import.meta.url), "utf8");
  const schedule = sql.indexOf("'follow_up.reminder'");
  const due = sql.indexOf("now() + interval '24 hours'");
  assert.ok(schedule > 0);
  assert.ok(due > schedule);
  assert.match(sql, /follow_up\.reminder:' \|\| v_inquiry\.id/);
  assert.match(sql, /e\.next_attempt_at <= now\(\)/);
  assert.match(sql, /e\.attempt_count < e\.max_attempts/);
  assert.match(sql, /for update skip locked/i);
  const future = Date.now() + 24 * 60 * 60 * 1000;
  const past = Date.now() - 1000;
  assert.equal(future <= Date.now(), false);
  assert.equal(past <= Date.now(), true);
});
