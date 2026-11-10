import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const phase4 = readFileSync(new URL("../../supabase/migrations/20261028_formshift_phase4.sql", import.meta.url), "utf8");
const phase7 = readFileSync(new URL("../../supabase/migrations/20261029_formshift_phase7_events.sql", import.meta.url), "utf8");
const form = readFileSync(new URL("../components/account/inquiry-form.tsx", import.meta.url), "utf8");
const action = readFileSync(new URL("../app/(marketing)/inquiries/actions.ts", import.meta.url), "utf8");

test("customers can read only their own inquiries", () => {
  assert.match(phase4, /policy inquiries_select_own on public\.inquiries/);
  assert.match(phase4, /for select to authenticated using \(user_id = auth\.uid\(\)\)/);
  assert.match(phase4, /auth\.uid\(\) is null and user_id is null/);
  assert.equal(/inquiries_select_own[\s\S]*for select to anon/.test(phase4), false);
});

test("the inquiry handler saves through Supabase before the worker runs", () => {
  const save = action.indexOf('rpc("record_inquiry"');
  const worker = action.indexOf("runInquiryAutomation(", save);
  assert.ok(save > 0);
  assert.ok(worker > save);
  assert.equal(action.includes("api.hubapi.com"), false);
  assert.equal(action.includes("api.resend.com"), false);
  assert.equal(form.includes("api.hubapi.com"), false);
  assert.equal(form.includes("api.resend.com"), false);
  assert.match(form, /pending \? "Sending to CRM…" : "Submit inquiry"/);
});

test("a saved inquiry enqueues its event inside the same database function", () => {
  const insert = phase7.indexOf("insert into public.inquiries");
  const event = phase7.indexOf("'inquiry.received'", insert);
  const follow = phase7.indexOf("now() + interval '24 hours'", insert);
  assert.ok(insert > 0);
  assert.ok(event > insert);
  assert.ok(follow > event);
  assert.match(phase7, /created_at >= now\(\) - interval '10 minutes'/);
});
