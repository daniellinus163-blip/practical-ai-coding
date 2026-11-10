"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitInquiryAction, type InquiryState } from "@/app/inquiries/actions";
import { liveConfigKey, type PublicVehicleConfig } from "@/configurator/saved-config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

const initialState: InquiryState = {
  error: null,
  success: null,
  referenceId: null,
  signedIn: false,
};

export function InquiryForm({
  vehicleSlug,
  configuration,
  configurationId,
}: {
  vehicleSlug?: string;
  configuration?: PublicVehicleConfig | null;
  configurationId?: string | null;
}) {
  const [state, action, pending] = useActionState(submitInquiryAction, initialState);
  function wrappedAction(formData: FormData) {
    if (pending) return;
    if (vehicleSlug && !formData.get("configuration")) {
      const live = sessionStorage.getItem(liveConfigKey(vehicleSlug));
      if (live) formData.set("configuration", live);
    }
    return action(formData);
  }

  const reference = state.referenceId ? `FSA-${state.referenceId.slice(0, 8).toUpperCase()}` : null;

  return (
    <Card className="shadow-[0_12px_40px_rgba(23,21,18,0.06)]">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="font-display text-2xl">Request a consultation</CardTitle>
          <Badge variant="secondary">HubSpot CRM</Badge>
        </div>
        <CardDescription>
          Professional quote request — synced to our sales pipeline with your studio configuration when
          available. This is not an order or manufacturer reservation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.success ? (
          <div className="space-y-4">
            <Alert>
              <AlertTitle>Inquiry submitted</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{state.success}</p>
                {reference ? (
                  <p className="font-mono text-sm">
                    Reference: <strong>{reference}</strong>
                  </p>
                ) : null}
                <p className="text-muted-foreground text-sm">
                  If you do not see email within a few minutes, check spam or promotions. Gmail sometimes filters
                  new senders for the first message.
                </p>
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-3">
              {state.referenceId ? (
                <Link
                  href={`/inquiries/confirmation?ref=${encodeURIComponent(state.referenceId)}`}
                  className={buttonVariants()}
                >
                  View confirmation page
                </Link>
              ) : null}
              {state.signedIn ? (
                <Link href="/account/inquiries" className={buttonVariants({ variant: "outline" })}>
                  My inquiries
                </Link>
              ) : (
                <Link href="/login?next=/account/inquiries" className={buttonVariants({ variant: "outline" })}>
                  Sign in to track inquiries
                </Link>
              )}
              <Link href="/discover" className={buttonVariants({ variant: "secondary" })}>
                Continue browsing
              </Link>
            </div>
          </div>
        ) : (
          <form action={wrappedAction} className="space-y-4">
            {vehicleSlug ? <input type="hidden" name="vehicleSlug" value={vehicleSlug} /> : null}
            {configurationId ? <input type="hidden" name="configurationId" value={configurationId} /> : null}
            {configuration ? (
              <input type="hidden" name="configuration" value={JSON.stringify(configuration)} />
            ) : null}

            <ol className="space-y-1 text-sm text-muted-foreground">
              <li>1. Tell us who you are and how to reach you.</li>
              <li>2. Describe what you need (allocation, spec, timeline, questions).</li>
              <li>3. We confirm by email and open a deal in HubSpot for the team.</li>
            </ol>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="inquiry-name">Full name</Label>
              <Input id="inquiry-name" name="name" required minLength={2} maxLength={80} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inquiry-email">Email</Label>
              <Input id="inquiry-email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inquiry-message">Message</Label>
              <Textarea
                id="inquiry-message"
                name="message"
                required
                minLength={10}
                maxLength={4000}
                rows={5}
                placeholder="Example: I am interested in a quote for this build. Timeline: within 3 months. Financing: exploring options."
              />
            </div>
            {state.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
              {pending ? "Sending to CRM…" : "Submit inquiry"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
