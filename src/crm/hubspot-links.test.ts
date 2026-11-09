import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hubspotContactRecordUrl,
  hubspotDealRecordUrl,
  hubspotPortalIdFromEnv,
  sanitizeHubspotRecordId,
} from "@/crm/hubspot-links";

describe("hubspot-links", () => {
  it("rejects non-numeric record ids", () => {
    assert.equal(sanitizeHubspotRecordId("abc"), null);
    assert.equal(sanitizeHubspotRecordId("12;drop"), null);
    assert.equal(sanitizeHubspotRecordId(" 12345 "), "12345");
  });

  it("builds urls only with portal and record ids", () => {
    const url = hubspotContactRecordUrl("123456", "987654");
    assert.equal(url, "https://app.hubspot.com/contacts/123456/contact/987654");
    assert.equal(hubspotContactRecordUrl("x", "1"), null);
    assert.equal(
      hubspotDealRecordUrl("123456", "555"),
      "https://app.hubspot.com/contacts/123456/deal/555",
    );
  });

  it("reads portal id from env when numeric", () => {
    const prev = process.env.HUBSPOT_PORTAL_ID;
    process.env.HUBSPOT_PORTAL_ID = " 44001234 ";
    assert.equal(hubspotPortalIdFromEnv(), "44001234");
    process.env.HUBSPOT_PORTAL_ID = "not-numeric";
    assert.equal(hubspotPortalIdFromEnv(), null);
    if (prev === undefined) delete process.env.HUBSPOT_PORTAL_ID;
    else process.env.HUBSPOT_PORTAL_ID = prev;
  });
});
