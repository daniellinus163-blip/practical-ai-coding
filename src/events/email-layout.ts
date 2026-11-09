function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function brandedEmailHtml(input: {
  preview: string;
  headline: string;
  bodyHtml: string;
  siteUrl?: string;
  cta?: { label: string; href: string };
  footnote?: string;
}) {
  const site = input.siteUrl?.replace(/\/$/, "") ?? "";
  const cta = input.cta
    ? `<p style="margin:28px 0 0;"><a href="${escapeHtml(input.cta.href)}" style="display:inline-block;background:#171512;color:#f6f1e8;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;">${escapeHtml(input.cta.label)}</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.headline)}</title>
</head>
<body style="margin:0;background:#ebe4d6;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#171512;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ebe4d6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffcf7;border:1px solid #d8d0c2;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;border-bottom:1px solid #d8d0c2;">
              <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#3b6ea8;">FormShift AI</p>
              <h1 style="margin:10px 0 0;font-family:Georgia,serif;font-size:26px;font-weight:600;line-height:1.25;">${escapeHtml(input.headline)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 28px;font-size:15px;line-height:1.6;">
              ${input.bodyHtml}
              ${cta}
              <p style="margin:32px 0 0;font-size:12px;color:#4a453c;">${escapeHtml(input.footnote ?? "Independent automotive discovery — not a dealer or manufacturer site.")}</p>
            </td>
          </tr>
          ${
            site
              ? `<tr>
            <td style="padding:18px 32px;background:#f4efe6;font-size:12px;color:#4a453c;">
              <a href="${escapeHtml(site)}" style="color:#171512;text-decoration:none;font-weight:600;">FormShift AI</a>
              &nbsp;·&nbsp; Catalog &amp; 3D studio
            </td>
          </tr>`
              : ""
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export { escapeHtml };
