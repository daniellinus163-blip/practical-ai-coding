import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveHubSpotObjectSync, parseHubspotExternalIds } from "./hubspot-sync-status";

describe("hubspot-sync-status", () => {
  it("parses external ids", () => {
    assert.deepEqual(parseHubspotExternalIds("contact:11;deal:22"), {
      contactId: "11",
      dealId: "22",
    });
  });

  it("only marks synced when delivery succeeded", () => {
    const sync = deriveHubSpotObjectSync({
      hubspotDelivery: {
        event_id: "e1",
        integration: "hubspot",
        status: "succeeded",
        attempt_count: 1,
        retryable: false,
        last_error: null,
        external_id: "contact:99;deal:88",
      },
      event: {
        id: "e1",
        event_type: "inquiry.received",
        status: "succeeded",
        attempt_count: 1,
        last_error: null,
        created_at: "",
        completed_at: null,
        next_attempt_at: null,
      },
      mappedRecordId: "99",
      recordKind: "contact",
    });
    assert.equal(sync.state, "synced");
    assert.equal(sync.recordId, "99");
    assert.equal(sync.canRetry, false);
  });

  it("does not mark synced when only mapping exists", () => {
    const sync = deriveHubSpotObjectSync({
      hubspotDelivery: null,
      event: {
        id: "e1",
        event_type: "inquiry.received",
        status: "queued",
        attempt_count: 0,
        last_error: null,
        created_at: "",
        completed_at: null,
        next_attempt_at: null,
      },
      mappedRecordId: "99",
      recordKind: "contact",
    });
    assert.equal(sync.state, "pending");
    assert.equal(sync.recordId, null);
  });

  it("surfaces retry for failed delivery", () => {
    const sync = deriveHubSpotObjectSync({
      hubspotDelivery: {
        event_id: "e1",
        integration: "hubspot",
        status: "failed",
        attempt_count: 2,
        retryable: true,
        last_error: "http_503",
        external_id: null,
      },
      event: {
        id: "e1",
        event_type: "inquiry.received",
        status: "failed",
        attempt_count: 2,
        last_error: "http_503",
        created_at: "",
        completed_at: null,
        next_attempt_at: null,
      },
      mappedRecordId: null,
      recordKind: "deal",
    });
    assert.equal(sync.state, "retry_required");
    assert.equal(sync.canRetry, true);
  });
});
