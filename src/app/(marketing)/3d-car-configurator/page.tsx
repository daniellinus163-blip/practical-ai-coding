import type { Metadata } from "next";
import Link from "next/link";
import { CONFIGURATOR_KEYWORDS } from "@/lib/seo/keywords";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "3D car configurator & virtual vehicle showroom",
  description:
    "FormShift AI offers an online 3D car configurator and interactive vehicle customization studio. " +
    "Explore luxury models, customize colour and trim in 3D, compare builds, and save configurations before inquiry.",
  alternates: { canonical: "/3d-car-configurator" },
  keywords: [...CONFIGURATOR_KEYWORDS],
};

export default function ThreeDCarConfiguratorPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brass)]">3D studio</p>
        <h1 className="font-display text-4xl text-[var(--ink)]">
          Online 3D car configurator &amp; interactive vehicle customization
        </h1>
        <p className="text-lg text-[var(--muted)]">
          FormShift AI is a virtual car showroom and custom car builder for enthusiasts and teams who want an honest
          catalog — not an official manufacturer site. Use our 3D car visualizer to explore trim and colour options,
          then open a full studio per model.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">What you can do</h2>
        <ul className="list-disc space-y-2 pl-5 text-[var(--ink)]">
          <li>Browse a digital vehicle showroom with labelled specifications.</li>
          <li>Launch an interactive car configurator for supported vehicles in the browser.</li>
          <li>Save builds when signed in and compare models side by side.</li>
          <li>Submit a configuration-backed inquiry — not a purchase or factory order.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Luxury &amp; performance catalog</h2>
        <p className="text-[var(--muted)]">
          Our luxury car configurator and luxury vehicle configurator flows cover hypercars, supercars, and flagship
          sedans from the seed catalog. Each 3D vehicle configurator loads only when you choose a car, so the homepage
          stays fast until you want automotive 3D visualization.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Customize a car online in 3D</h2>
        <p className="text-[var(--muted)]">
          Pick a vehicle, open the studio, and adjust supported options. Car customization online works best on a desktop
          with WebGL enabled; mobile visitors can still read specs and send inquiries.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/discover" className={buttonVariants({ size: "lg" })}>
            Discover cars
          </Link>
          <Link href="/cars/bugatti-chiron#studio" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Open Chiron 3D studio
          </Link>
        </div>
      </section>

      <p className="text-xs text-[var(--muted)]">
        Related topics: {CONFIGURATOR_KEYWORDS.slice(0, 8).join(" · ")}.
      </p>
    </article>
  );
}
