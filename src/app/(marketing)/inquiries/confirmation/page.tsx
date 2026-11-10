import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { catalogRepository } from "@/catalog/local-repository";
import { buildConfigurationDetails } from "@/crm/configuration-summary";
import { LeadConfigurationPanel } from "@/components/staff/lead-configuration-panel";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Inquiry received", robots: { index: false, follow: false } };

export default function InquiryConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-2xl px-4 py-16 text-sm">Loading…</p>}>
      <ConfirmationBody searchParams={searchParams} />
    </Suspense>
  );
}

async function ConfirmationBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const refRaw = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const inquiryId = refRaw?.trim() ?? "";
  const reference =
    /^[0-9a-f-]{36}$/i.test(inquiryId) ? `FSA-${inquiryId.slice(0, 8).toUpperCase()}` : null;

  const user = await getAuthUser();

  let ownedInquiry: {
    message: string;
    vehicle_slug: string | null;
    configuration_snapshot: unknown;
    configuration_id: string | null;
    status: string;
    created_at: string;
  } | null = null;

  if (user && isSupabaseConfigured() && reference && inquiryId) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("inquiries")
        .select("id, message, vehicle_slug, configuration_snapshot, configuration_id, status, created_at")
        .eq("id", inquiryId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) ownedInquiry = data;
    }
  }

  const vehicle =
    ownedInquiry?.vehicle_slug ? await catalogRepository.getVehicleBySlug(ownedInquiry.vehicle_slug) : null;
  const configRows =
    ownedInquiry && vehicle
      ? buildConfigurationDetails({
          snapshot: ownedInquiry.configuration_snapshot,
          vehicle,
          savedConfigurationName: null,
          savedConfigurationId: ownedInquiry.configuration_id,
          defaultTrimName: null,
        })
      : [];

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-3xl">Thank you — inquiry received</CardTitle>
          <CardDescription>
            Your message is stored securely. Our team is notified through the same CRM pipeline staff use in the
            command centre. This is a consultation request, not an order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {reference ? (
            <p>
              Reference: <strong className="font-mono">{reference}</strong>
            </p>
          ) : (
            <p className="text-[var(--muted)]">Keep the confirmation link from your email if you need the reference id.</p>
          )}
          <ul className="list-inside list-disc space-y-1 text-[var(--muted)]">
            <li>Confirmation email is sent when Resend is configured on the server (delivery not guaranteed to inbox).</li>
            <li>HubSpot sync runs in the background — staff see honest sync status on your lead.</li>
            <li>Duplicate submissions within 10 minutes reuse the same inquiry (no second deal).</li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            {user ? (
              <Link href="/account/inquiries" className={buttonVariants()}>
                My inquiries
              </Link>
            ) : (
              <Link href={`/login?next=${encodeURIComponent("/account/inquiries")}`} className={buttonVariants()}>
                Sign in to track inquiries
              </Link>
            )}
            <Link href="/discover" className={buttonVariants({ variant: "outline" })}>
              Continue browsing
            </Link>
          </div>
        </CardContent>
      </Card>

      {ownedInquiry ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Your submission</CardTitle>
              <CardDescription>Only visible because you are signed in as the submitter.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ownedInquiry.message}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">Status: {ownedInquiry.status}</p>
            </CardContent>
          </Card>
          <LeadConfigurationPanel
            rows={configRows}
            vehicleHref={ownedInquiry.vehicle_slug ? `/cars/${ownedInquiry.vehicle_slug}` : null}
            previewNote="Open the vehicle page in the studio to see the live 3D preview. We do not store rendered images yet."
          />
        </div>
      ) : reference && user ? (
        <p className="text-sm text-[var(--muted)]">
          This reference is not linked to your account. Inquiries submitted before sign-in, or with a different email,
          are not listed here for privacy.
        </p>
      ) : !user && reference ? (
        <p className="text-sm text-[var(--muted)]">
          Sign in with the same email you used on the form to view configuration details on this page.
        </p>
      ) : null}
    </main>
  );
}
