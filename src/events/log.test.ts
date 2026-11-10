import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeLogMessage, staffDisplayError } from "./log";

describe("integration log sanitization", () => {
  it("redacts bearer tokens and emails", () => {
    const raw = "Bearer pat-na1-abcdef and buyer@example.com failed";
    assert.equal(safeLogMessage(raw).includes("pat-na1"), false);
    assert.match(safeLogMessage(raw), /\[redacted\]/);
    assert.match(safeLogMessage(raw), /\[redacted-email\]/);
  });

  it("staff display truncates safely", () => {
    const out = staffDisplayError("authorization: Bearer sk_live_secret");
    assert.ok(out);
    assert.equal(out!.includes("sk_live"), false);
    assert.equal(out!.toLowerCase().includes("bearer sk"), false);
  });
});
