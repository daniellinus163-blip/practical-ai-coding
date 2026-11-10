import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FactLegend } from "@/components/catalog/fact-legend";
import { SpecList } from "@/components/catalog/spec-list";
import { StatusBadge } from "@/components/catalog/status-badge";
import { InquiryForm } from "@/components/account/inquiry-form";
import { VehicleStudio } from "@/components/configurator/vehicle-studio";
import { catalogRepository } from "@/catalog/local-repository";
import { bodyCopy } from "@/catalog/labels";
import { getVehicle3DAsset } from "@/configurator/manifest";
import {
  decodeShareParam,
  expandSharePayload,
  sanitizePublicConfig,
  type PublicVehicleConfig,
} from "@/configurator/saved-config";
import { VehiclePageSkeleton } from "@/components/skeletons/vehicle-page-skeleton";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase/server";
import { getPublicSiteOrigin } from "@/lib/seo/site";

export async function generateStaticParams() {
  const vehicles = await catalogRepository.listVehicles();
  return vehicles.map((vehicle) => ({ slug: vehicle.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vehicle = await catalogRepository.getVehicleBySlug(slug);
  if (!vehicle) return { title: "Vehicle" };
  const title = `${vehicle.brand.name} ${vehicle.model} — 3D configurator`;
  const description = `Configure the ${vehicle.brand.name} ${vehicle.model} in FormShift AI’s interactive 3D studio. Explore colours, trim, and options, then send a configuration-backed inquiry.`;
  return {
    title,
    description,
    alternates: { canonical: `/cars/${slug}` },
    openGraph: {
      title,
      description,
      url: `${getPublicSiteOrigin()}/cars/${slug}`,
      type: "website",
    },
  };
}

export default function VehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<VehiclePageSkeleton />}>
      <VehicleBody params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function loadSavedBuild(id: string | undefined, slug: string): Promise<{
  config: PublicVehicleConfig | null;
  id: string | null;
}> {
  if (!id) return { config: null, id: null };
  const user = await getAuthUser();
  if (!user) return { config: null, id: null };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { config: null, id: null };
  const { data } = await supabase
    .from("saved_configurations")
    .select("id, vehicle_slug, payload")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data || data.vehicle_slug !== slug) return { config: null, id: null };
  return { config: data.payload as PublicVehicleConfig, id: data.id };
}

async function VehicleBody({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { slug } = await params;
  const vehicle = await catalogRepository.getVehicleBySlug(slug);
  if (!vehicle) notFound();

  const query = await searchParams;
  const asset = getVehicle3DAsset(vehicle.slug);
  const saved = await loadSavedBuild(firstParam(query.build), vehicle.slug);
  const shared = expandSharePayload(decodeShareParam(firstParam(query.c)));
  const restored = sanitizePublicConfig(saved.config ?? shared, vehicle, asset);

  return (
    <div className="space-y-10 py-12">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            {vehicle.brand.name}
          </p>
          <h1 className="font-display text-5xl">{vehicle.model}</h1>
          <p className="mt-2 text-[var(--muted)]">
            {bodyCopy[vehicle.bodyStyle]}
            {vehicle.modelYear ? ` · ${vehicle.modelYear}` : ""}
          </p>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>
      {asset ? (
        <div className="mx-auto max-w-[92rem] px-4">
          <VehicleStudio
            asset={asset}
            brandSlug={vehicle.brand.slug}
            modelName={`${vehicle.brand.name} ${vehicle.model}`}
            vehicleId={vehicle.id}
            initialConfig={restored}
            savedBuildId={saved.id}
          />
        </div>
      ) : null}
      {vehicle.modelYearNote ? (
        <p className="mx-auto max-w-6xl px-4 text-sm text-[var(--muted)]">{vehicle.modelYearNote}</p>
      ) : null}
      <p className="mx-auto max-w-6xl px-4 text-lg">{vehicle.description}</p>
      <p className="mx-auto max-w-6xl px-4 text-sm">
        <span className="block border border-[var(--line)] bg-[var(--card)] p-4 text-[var(--muted)]">
          {vehicle.independenceDisclaimer} {vehicle.brand.trademarkNote}
        </span>
      </p>
      <div className="mx-auto max-w-6xl space-y-10 px-4">
        <FactLegend />
        <SpecList specifications={vehicle.specifications} configurations={vehicle.configurations} />
        <section>
          <h2 className="font-display text-2xl">Catalogued configuration features</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {vehicle.options.map((option) => (
              <li key={option.id} className="border border-[var(--line)] bg-[var(--card)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  {option.category} · {option.availability}
                </p>
                <h3 className="mt-1 text-lg">{option.name}</h3>
                {option.description ? <p className="mt-2 text-sm">{option.description}</p> : null}
                {option.notes ? <p className="mt-2 text-sm text-[var(--muted)]">{option.notes}</p> : null}
              </li>
            ))}
          </ul>
        </section>
        <InquiryForm vehicleSlug={vehicle.slug} configuration={restored} configurationId={saved.id} />
      </div>
    </div>
  );
}
