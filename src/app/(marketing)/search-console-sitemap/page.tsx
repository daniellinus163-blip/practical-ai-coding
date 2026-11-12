import type { Metadata } from "next";
import Link from "next/link";
import { getRequestSiteOrigin } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Search Console sitemap setup",
  robots: { index: false, follow: false },
};

export default async function SearchConsoleSitemapHelpPage() {
  const origin = await getRequestSiteOrigin();
  const sitemapUrl = `${origin}/sitemap.xml`;
  const gscSitemaps = `https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(`${origin}/`)}`;

  return (
    <article className="mx-auto max-w-xl space-y-6 px-4 py-12 text-[var(--ink)]">
      <h1 className="font-display text-3xl">Fix the Google Search Console sitemap error</h1>
      <p className="text-[var(--muted)]">
        If your Sitemaps table shows <strong className="text-[var(--ink)]">/</strong> with{" "}
        <strong className="text-[var(--ink)]">1 error</strong>, you submitted the homepage — not the XML sitemap.
        Delete that row, then submit the path below.
      </p>

      <section className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--bg-2)] p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--brass)]">Correct sitemap file</p>
        <p className="break-all font-mono text-sm">{sitemapUrl}</p>
        <p className="text-sm text-[var(--muted)]">
          Open it in a new tab — you must see XML (<code className="text-xs">&lt;urlset&gt;</code>), not the FormShift
          homepage.
        </p>
        <Link href="/sitemap.xml" className="text-sm text-[var(--brass)] underline" target="_blank">
          Open sitemap.xml
        </Link>
      </section>

      <section className="space-y-2 rounded-lg border border-amber-600/40 bg-amber-50/80 p-4 text-sm dark:bg-amber-950/20">
        <p className="font-medium text-[var(--ink)]">“This URL is invalid” in Search Console</p>
        <ul className="list-disc space-y-2 pl-5 text-[var(--muted)]">
          <li>
            <strong className="text-[var(--ink)]">Do not</strong> paste{" "}
            <span className="font-mono">{origin}/</span> or the full homepage in the sitemap box — that is invalid.
          </li>
          <li>
            The property (top-left) must be the <strong>same host</strong> you use in the browser (e.g. uqjh, 8re8,
            zh1z). You cannot submit a uqjh sitemap while logged into an 8re8 property.
          </li>
          <li>In the sitemap box, type only: <strong className="font-mono">sitemap.xml</strong></li>
          <li>
            When adding a new <strong>property</strong>, use URL prefix: <span className="font-mono">{origin}</span>{" "}
            (no path, no <span className="font-mono">/sitemap.xml</span>).
          </li>
        </ul>
      </section>

      <ol className="list-decimal space-y-3 pl-5 text-sm">
        <li>
          Open{" "}
          <a href={gscSitemaps} className="text-[var(--brass)] underline" target="_blank" rel="noopener noreferrer">
            Google Search Console → Sitemaps
          </a>{" "}
          for <span className="font-mono">{origin}</span>.
        </li>
        <li>
          On the row where <strong>Sitemap</strong> is <strong>/</strong>, click <strong>⋮</strong> →{" "}
          <strong>Remove sitemap</strong>.
        </li>
        <li>
          Under <strong>Add a new sitemap</strong>, type only in the small box:{" "}
          <strong className="font-mono">sitemap.xml</strong> (not <strong>/</strong>, not the full https URL).
        </li>
        <li>Click <strong>Submit</strong> and wait a few minutes for <strong>Success</strong> and ~19 pages.</li>
      </ol>

      <p className="text-xs text-[var(--muted)]">
        <Link href="/">← Back to home</Link>
      </p>
    </article>
  );
}
