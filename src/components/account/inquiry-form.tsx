"use client";

import { useActionState } from "react";
import { submitInquiryAction, type InquiryState } from "@/app/inquiries/actions";
import { liveConfigKey, type PublicVehicleConfig } from "@/configurator/saved-config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function InquiryForm({
  vehicleSlug,
  configuration,
  configurationId,
}: {
  vehicleSlug?: string;
  configuration?: PublicVehicleConfig | null;
  configurationId?: string | null;
}) {
  const [state, action, pending] = useActionState(submitInquiryAction, {
    error: null,
    success: null,
  } satisfies InquiryState);
  function wrappedAction(formData: FormData) {
    if (pending) return;
    if (vehicleSlug && !formData.get("configuration")) {
      const live = sessionStorage.getItem(liveConfigKey(vehicleSlug));
      if (live) formData.set("configuration", live);
    }
    return action(formData);
  }

  return (
    <Card className="shadow-[0_12px_40px_rgba(23,21,18,0.06)]">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Request a quote</CardTitle>
        <CardDescription>
          Name, email, and your question only. An inquiry is not an order, allocation, or manufacturer
          reservation. The current studio selection is attached when present.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={wrappedAction} className="space-y-4">
          {vehicleSlug ? <input type="hidden" name="vehicleSlug" value={vehicleSlug} /> : null}
          {configurationId ? <input type="hidden" name="configurationId" value={configurationId} /> : null}
          {configuration ? (
            <input type="hidden" name="configuration" value={JSON.stringify(configuration)} />
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="inquiry-name">Name</Label>
            <Input id="inquiry-name" name="name" required minLength={2} maxLength={80} autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inquiry-email">Email</Label>
            <Input
              id="inquiry-email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
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
            />
          </div>
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {state.success ? (
            <Alert>
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
            {pending ? "Sending…" : "Send inquiry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
