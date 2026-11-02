import assert from "node:assert/strict";
import test from "node:test";
import { internalInquiryEmail } from "./emails.ts";
import { getEmailSiteUrl } from "../lib/supabase/env.ts";

function withSiteUrl(value: string | undefined, run: () => void) {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  if (value === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = value;
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
}

test("development email links can use the local app URL", () => {
  withSiteUrl("http://localhost:3000", () => {
    assert.equal(getEmailSiteUrl("development"), "http://localhost:3000");
    const mail = internalInquiryEmail({
      vehicleSlug: "aston-martin-valkyrie",
      leadId: "23254988-c3e1-4a55-bec4-06ad12f9b94f",
      siteUrl: getEmailSiteUrl("development"),
    });
    assert.match(mail.text, /http:\/\/localhost:3000\/staff\/leads\/23254988-c3e1-4a55-bec4-06ad12f9b94f/);
  });
});

test("production email links use the deployed origin and never localhost", () => {
  withSiteUrl("http://localhost:3000", () => {
    assert.equal(getEmailSiteUrl("production"), "");
    const blocked = internalInquiryEmail({
      vehicleSlug: "aston-martin-valkyrie",
      leadId: "23254988-c3e1-4a55-bec4-06ad12f9b94f",
      siteUrl: getEmailSiteUrl("production"),
    });
    assert.equal(blocked.text.includes("localhost"), false);
    assert.equal(blocked.html.includes("localhost"), false);
  });
  withSiteUrl("https://formshift.example", () => {
    assert.equal(getEmailSiteUrl("production"), "https://formshift.example");
    const live = internalInquiryEmail({
      vehicleSlug: "aston-martin-valkyrie",
      leadId: "23254988-c3e1-4a55-bec4-06ad12f9b94f",
      siteUrl: getEmailSiteUrl("production"),
    });
    assert.match(live.html, /https:\/\/formshift\.example\/staff\/leads\/23254988-c3e1-4a55-bec4-06ad12f9b94f/);
    assert.equal(live.html.includes("localhost"), false);
  });
});
