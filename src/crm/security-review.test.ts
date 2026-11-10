import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");

const staffActions = readFileSync(join(repo, "src/app/staff/actions.ts"), "utf8");
const guard = readFileSync(join(repo, "src/crm/guard.ts"), "utf8");
const phase4 = readFileSync(join(repo, "supabase/migrations/20261028_formshift_phase4.sql"), "utf8");
const phase7 = readFileSync(join(repo, "supabase/migrations/20261029_formshift_phase7_events.sql"), "utf8");

function staffActionExports(source: string): string[] {
  return [...source.matchAll(/^export async function (\w+)/gm)].map((m) => m[1]);
}

describe("security and reliability review", () => {
  it("staff server actions require staff context", () => {
    for (const name of staffActionExports(staffActions)) {
      const start = staffActions.indexOf(`export async function ${name}`);
      const next = staffActions.indexOf("export async function", start + 1);
      const body = staffActions.slice(start, next > 0 ? next : start + 5000);
      assert.match(body, /requireStaff\(/, `${name} must call requireStaff`);
    }
  });

  it("staff guard redirects unauthenticated users", () => {
    assert.match(guard, /redirect\(`\/login/);
    assert.match(guard, /redirect\("\/staff-denied"\)/);
    assert.match(guard, /getStaffRole/);
  });

  it("inquiries are scoped to owning user in RLS", () => {
    assert.match(phase4, /policy inquiries_select_own/);
    assert.match(phase4, /user_id = auth\.uid\(\)/);
  });

  it("duplicate inquiries reuse idempotent automation key", () => {
    assert.match(phase7, /idempotency_key = 'inquiry\.received:'/);
    assert.match(phase7, /submission_hash/);
    assert.match(phase7, /interval '10 minutes'/);
  });

  it("record_inquiry rejects cross-user user_id", () => {
    assert.match(phase7, /v_uid is distinct from p_user_id/);
  });

  it("client bundles do not embed service role env names", () => {
    const clientFiles = collectFiles(join(repo, "src/components"), [".tsx"]);
    const offenders = clientFiles.filter((file) => {
      const text = readFileSync(file, "utf8");
      return (
        text.includes("SUPABASE_SERVICE_ROLE_KEY") ||
        text.includes("HUBSPOT_ACCESS_TOKEN") ||
        text.includes("RESEND_API_KEY")
      );
    });
    assert.deepEqual(offenders, []);
  });

  it("staff shell enforces access on every page", () => {
    const pages = collectFiles(join(repo, "src/app/staff"), [".tsx"]).filter((f) => f.endsWith("page.tsx"));
    for (const page of pages) {
      const text = readFileSync(page, "utf8");
      assert.match(text, /requireStaff\(|StaffShell/, `${page} must gate staff access`);
    }
  });
});

function collectFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(path, exts));
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(path);
  }
  return out;
}
