import Link from "next/link";
import { Suspense } from "react";
import { VehicleCard } from "@/components/catalog/vehicle-card";
import { HomeMotion } from "@/components/home/home-motion";
import { StudioTeaser } from "@/components/home/studio-teaser";
import { catalogRepository } from "@/catalog/local-repository";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function Home() {
  const vehicles = await catalogRepository.listVehicles();
  const brands = await catalogRepository.listBrands();

  return (
    <HomeMotion>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:py-20">
        <div>
          <p data-hero="kicker" className="text-[11px] uppercase tracking-[0.32em] text-[var(--accent)]">
            FormShift AI · independent catalog
          </p>
          <h1 data-hero="title" className="font-display mt-4 text-5xl leading-tight text-[var(--ink)] md:text-6xl">
            Specify the machine. Keep the facts honest.
          </h1>
          <p data-hero="copy" className="mt-5 max-w-xl text-lg text-[var(--ink)]">
            Thirteen 3D cars from your library, including Jesko Absolut, Huayra, Valkyrie, AMG ONE,
            and Maybach S-Class and GLS, in an interactive studio. Not a dealer. Not an official
            manufacturer site.
          </p>
          <div data-hero="cta" className="mt-8 flex flex-wrap gap-3">
            <Link href="/discover" className={buttonVariants({ size: "lg" })}>
              Discover cars
            </Link>
            <Link
              href="/cars/bugatti-chiron#studio"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Open Chiron studio
            </Link>
          </div>
        </div>
        <div data-hero="stage">
          <StudioTeaser />
          <p className="mt-2 text-xs text-[var(--ink)]">
            Homepage stays light until you load the 3D preview. Full cars open on their own pages.
          </p>
        </div>
      </section>

      <section className="bg-[var(--bg-2)] px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Brands</p>
          <h2 className="font-display mt-2 text-4xl text-[var(--ink)]">Filter the catalog by marque</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {brands.map((brand) => (
              <Link key={brand.id} data-reveal href={`/discover?brand=${brand.slug}`} className="block">
                <Card className="h-full p-6 transition hover:-translate-y-0.5 hover:ring-[var(--accent)]">
                  <p className="font-display text-2xl">{brand.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">View vehicles →</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Featured</p>
            <h2 className="font-display text-4xl text-[var(--ink)]">Initial collection</h2>
          </div>
          <Link href="/discover" className="text-sm text-[var(--accent)]">
            View all
          </Link>
        </div>
        <Suspense>
          <div className="grid gap-6 md:grid-cols-2">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} data-reveal>
                <VehicleCard vehicle={vehicle} compareSlugs={[]} />
              </div>
            ))}
          </div>
        </Suspense>
      </section>

      <section data-reveal className="border-t border-[var(--line)] bg-[var(--hero)] px-4 py-16 text-[var(--hero-text)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-4xl text-[var(--hero-text)]">Compare labelled facts side by side</h2>
            <p className="mt-3 max-w-xl text-[var(--hero-text)]">
              Unavailable numbers stay blank. The Roadster is marked upcoming. An inquiry is not an
              order.
            </p>
          </div>
          <Link
            href="/discover"
            className={buttonVariants({
              variant: "secondary",
              size: "lg",
              className:
                "bg-white text-foreground hover:bg-[var(--accent)] hover:text-[var(--hero-text)]",
            })}
          >
            Start with Discover
          </Link>
        </div>
      </section>
    </HomeMotion>
  );
}
