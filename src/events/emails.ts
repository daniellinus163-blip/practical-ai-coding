import { brandedEmailHtml, escapeHtml } from "@/events/email-layout";
import { getEmailSiteUrl } from "@/lib/supabase/env";

function vehicleLabel(slug: string | null) {
  if (!slug) return "our catalog";
  return slug.replace(/-/g, " ");
}

function referenceLine(inquiryId: string | null) {
  if (!inquiryId) return "";
  const short = inquiryId.slice(0, 8).toUpperCase();
  return `Reference: FSA-${short}`;
}

export function inquiryConfirmationEmail(input: {
  name: string;
  vehicleSlug: string | null;
  siteUrl: string;
  inquiryId?: string | null;
}) {
  const site = input.siteUrl || getEmailSiteUrl() || "";
  const vehicle = vehicleLabel(input.vehicleSlug);
  const ref = referenceLine(input.inquiryId ?? null);
  const subject = ref ? `${ref} — we received your inquiry` : "We received your FormShift AI inquiry";
  const text = [
    `Hello ${input.name},`,
    "",
    `Thank you for contacting FormShift AI about ${vehicle}.`,
    ref,
    "",
    "What happens next:",
    "• Our team reviews your message in our CRM (HubSpot).",
    "• You will receive a personal reply by email if follow-up is needed.",
    "• This is not an order, allocation, or manufacturer reservation.",
    "",
    `Track builds and signed-in inquiries: ${site}/account/inquiries`,
    `Browse vehicles: ${site}/discover`,
    "",
    "FormShift AI",
  ].join("\n");

  const html = brandedEmailHtml({
    siteUrl: site,
    preview: "Your inquiry is logged. Expect a confirmation in our system — not an order.",
    headline: "Inquiry received",
    bodyHtml: `<p>Hello ${escapeHtml(input.name)},</p>
<p>Thank you for reaching out about <strong>${escapeHtml(vehicle)}</strong>.</p>
${ref ? `<p style="margin:16px 0;padding:12px 14px;background:#f4efe6;border-radius:8px;font-size:13px;"><strong>${escapeHtml(ref)}</strong><br/>Keep this reference if you contact us again.</p>` : ""}
<p><strong>What happens next</strong></p>
<ul style="margin:0;padding-left:20px;">
  <li>Your request is synced to our CRM pipeline.</li>
  <li>We respond by email when a specialist is assigned.</li>
  <li>This is <strong>not</strong> an order or manufacturer reservation.</li>
</ul>`,
    cta: { label: "View the catalog", href: `${site}/discover` },
    footnote: "Check spam or promotions if you do not see staff replies. Add our domain to your safe senders list.",
  });

  return { subject, text, html };
}

export function internalInquiryEmail(input: {
  vehicleSlug: string | null;
  leadId: string | null;
  inquiryId?: string | null;
  siteUrl: string;
  customerName?: string | null;
}) {
  const site = input.siteUrl.replace(/\/$/, "");
  const leadUrl = input.leadId ? `${site}/staff/leads/${input.leadId}` : `${site}/staff/leads`;
  const ref = referenceLine(input.inquiryId ?? null);
  const subject = ref ? `${ref} — new studio inquiry` : "New FormShift AI inquiry";
  const text = [
    "A new qualified inquiry was recorded.",
    ref,
    `Vehicle: ${input.vehicleSlug ?? "unspecified"}`,
    input.customerName ? `Contact: ${input.customerName}` : "",
    `Open CRM lead: ${leadUrl}`,
    "Customer message and email are stored in Supabase + HubSpot — not in this alert body.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = brandedEmailHtml({
    siteUrl: site,
    preview: "New FormShift inquiry ready in CRM.",
    headline: "New inquiry",
    bodyHtml: `<p>A new inquiry was submitted from the digital studio.</p>
${ref ? `<p style="margin:16px 0;padding:12px 14px;background:#f4efe6;border-radius:8px;font-size:13px;"><strong>${escapeHtml(ref)}</strong></p>` : ""}
<p><strong>Vehicle:</strong> ${escapeHtml(input.vehicleSlug ?? "unspecified")}</p>
${input.customerName ? `<p><strong>Contact:</strong> ${escapeHtml(input.customerName)}</p>` : ""}
<p>Open the lead record for the full message, configuration snapshot, and HubSpot deal.</p>`,
    cta: { label: "Open staff lead", href: leadUrl },
  });

  return { subject, text, html };
}

export function followUpEmail(input: {
  name: string;
  vehicleSlug: string | null;
  siteUrl: string;
  inquiryId?: string | null;
}) {
  const vehicle = vehicleLabel(input.vehicleSlug);
  const site = input.siteUrl || getEmailSiteUrl() || "";
  const subject = "Following up on your FormShift AI inquiry";
  const text = [
    `Hello ${input.name},`,
    "",
    `We are following up on your inquiry about ${vehicle}. Reply to this thread if you still need help.`,
    "",
    "This is a transactional follow-up, not marketing, and not an order.",
    site,
    "FormShift AI",
  ].join("\n");

  const html = brandedEmailHtml({
    siteUrl: site,
    preview: "Quick follow-up on your FormShift inquiry.",
    headline: "Still interested?",
    bodyHtml: `<p>Hello ${escapeHtml(input.name)},</p>
<p>We wanted to follow up on your inquiry about <strong>${escapeHtml(vehicle)}</strong>.</p>
<p>Reply if you would like to continue the conversation. No pressure — this is not an order or promotion blast.</p>`,
    cta: { label: "Return to FormShift", href: site },
  });

  return { subject, text, html };
}
