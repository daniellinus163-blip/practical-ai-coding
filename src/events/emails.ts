export function inquiryConfirmationEmail(input: {
  name: string;
  vehicleSlug: string | null;
  siteUrl: string;
}) {
  const vehicle = input.vehicleSlug ? ` about ${input.vehicleSlug.replace(/-/g, " ")}` : "";
  const subject = "We received your FormShift AI inquiry";
  const text = [
    `Hello ${input.name},`,
    "",
    `Thank you. FormShift AI has recorded your inquiry${vehicle}.`,
    "This is not an order, reservation, or manufacturer confirmation.",
    "",
    `You can return to the catalog at ${input.siteUrl}/discover`,
    "",
    "FormShift AI",
  ].join("\n");
  const html = `<p>Hello ${escapeHtml(input.name)},</p>
<p>Thank you. FormShift AI has recorded your inquiry${escapeHtml(vehicle)}.</p>
<p><strong>This is not an order, reservation, or manufacturer confirmation.</strong></p>
<p><a href="${escapeHtml(input.siteUrl)}/discover">Return to the catalog</a></p>
<p>FormShift AI</p>`;
  return { subject, text, html };
}

export function internalInquiryEmail(input: {
  vehicleSlug: string | null;
  leadId: string | null;
  siteUrl: string;
}) {
  const leadUrl = input.siteUrl && input.leadId ? `${input.siteUrl.replace(/\/$/, "")}/staff/leads/${input.leadId}` : "";
  const subject = "New FormShift AI inquiry";
  const text = [
    "A new inquiry was recorded.",
    `Vehicle: ${input.vehicleSlug ?? "unspecified"}`,
    leadUrl ? `Open the lead: ${leadUrl}` : "Open the lead from the staff CRM after you sign in.",
    "Customer contact details are in the CRM, not in this notification body.",
  ].join("\n");
  const html = `<p>A new inquiry was recorded.</p>
<p>Vehicle: ${escapeHtml(input.vehicleSlug ?? "unspecified")}</p>
${
  leadUrl
    ? `<p><a href="${escapeHtml(leadUrl)}">Open the lead</a></p>`
    : "<p>Open the lead from the staff CRM after you sign in.</p>"
}
<p>Customer contact details are in the CRM, not in this notification body.</p>`;
  return { subject, text, html };
}

export function followUpEmail(input: { name: string; vehicleSlug: string | null; siteUrl: string }) {
  const vehicle = input.vehicleSlug ? ` ${input.vehicleSlug.replace(/-/g, " ")}` : " a vehicle";
  const subject = "Following up on your FormShift AI inquiry";
  const text = [
    `Hello ${input.name},`,
    "",
    `This is a follow-up on your inquiry about${vehicle}. Reply only if you still want help.`,
    "This is not marketing and not an order.",
    "",
    input.siteUrl,
    "FormShift AI",
  ].join("\n");
  const html = `<p>Hello ${escapeHtml(input.name)},</p>
<p>This is a follow-up on your inquiry about${escapeHtml(vehicle)}. Reply only if you still want help.</p>
<p>This is not marketing and not an order.</p>
<p>FormShift AI</p>`;
  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
