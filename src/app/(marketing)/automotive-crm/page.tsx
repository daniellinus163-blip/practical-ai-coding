import type { Metadata } from "next";
import Link from "next/link";
import { CRM_AUTOMATION_KEYWORDS } from "@/lib/seo/keywords";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Automotive CRM, lead tracking & sales automation",
  description:
    "FormShift AI combines vehicle inquiry management, automotive lead management, pipeline stages, HubSpot sync, " +
    "automated follow-ups, and email automation for authorised staff — alongside a public 3D configurator.",
  alternates: { canonical: "/automotive-crm" },
  keywords: [...CRM_AUTOMATION_KEYWORDS],
};

export default function AutomotiveCrmPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brass)]">Staff platform</p>
        <h1 className="font-display text-4xl text-[var(--ink)]">
          Automotive CRM automation &amp; vehicle inquiry management
        </h1>
        <p className="text-lg text-[var(--muted)]">
          Authorised teams use FormShift AI as an automotive customer relationship management layer: car sales lead
          tracking, pipeline management, automated vehicle inquiry notifications, and CRM integration for automotive
          businesses (HubSpot + Supabase). The public site is separate from the staff command center.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Lead &amp; inquiry workflow</h2>
        <ul className="list-disc space-y-2 pl-5 text-[var(--ink)]">
          <li>Vehicle inquiry management system captures builds and messages from the 3D configurator.</li>
          <li>Automotive lead management software creates leads, tasks, and audit history per customer.</li>
          <li>Car dealership lead tracking system with stages, assignment, and priority.</li>
          <li>Automated customer follow-up system for due and overdue tasks with staff notifications.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Integrations &amp; automation</h2>
        <p className="text-[var(--muted)]">
          Automotive email automation (Resend), HubSpot deal sync, event worker queue, and integration monitoring support
          automotive business process automation without replacing your entire car dealership CRM system — FormShift
          focuses on inquiry-to-pipeline flows tied to your configured catalog.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Access</h2>
        <p className="text-[var(--muted)]">
          The command center is for verified staff only. Customers use My Builds and account inquiries; no private lead
          data is exposed to search engines.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/login?next=/staff" className={buttonVariants({ size: "lg" })}>
            Staff sign in
          </Link>
          <Link href="/about" className={buttonVariants({ variant: "outline", size: "lg" })}>
            About FormShift AI
          </Link>
        </div>
      </section>

      <p className="text-xs text-[var(--muted)]">
        Related topics: {CRM_AUTOMATION_KEYWORDS.slice(0, 8).join(" · ")}.
      </p>
    </article>
  );
}
