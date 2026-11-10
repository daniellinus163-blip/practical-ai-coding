"use client";

import Link from "next/link";
import type { Provider } from "@supabase/supabase-js";
import { useActionState, useState } from "react";
import { oauthCallbackRedirectUri, setAuthNextCookie } from "@/lib/supabase/auth-redirect";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type State = { error: string | null; success: string | null };

type OAuthProvider = Extract<Provider, "github" | "x">;

export function CredentialsForm({
  action,
  submitLabel,
  mode,
  nextPath,
  oauthError: oauthErrorProp,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  submitLabel: string;
  mode: "signin" | "signup" | "reset" | "password";
  nextPath?: string;
  oauthError?: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: null,
  });

  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(oauthErrorProp ?? null);

  async function signInWithProvider(provider: OAuthProvider) {
    setOauthPending(provider);
    setOauthError(null);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setOauthError("Supabase is not configured.");
      setOauthPending(null);
      return;
    }

    const origin = window.location.origin;
    const nextFromUrl =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null;
    const oauthNext = safeNextPath(nextPath ?? nextFromUrl, "/account");
    setAuthNextCookie(origin, oauthNext);

    const options: { redirectTo: string; scopes?: string } = {
      redirectTo: oauthCallbackRedirectUri(origin),
    };
    if (provider === "github") {
      options.scopes = "read:user user:email";
    }

    const { error } = await supabase.auth.signInWithOAuth({ provider, options });
    if (error) {
      setOauthError(error.message);
      setOauthPending(null);
    }
  }

  const showSocialButtons = mode === "signin" || mode === "signup";
  const displayedOauthError = oauthError ?? oauthErrorProp;

  return (
    <form action={formAction} className="space-y-4">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

      {showSocialButtons ? (
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => signInWithProvider("github")}
            disabled={oauthPending !== null}
          >
            {oauthPending === "github" ? "Connecting to GitHub…" : "Continue with GitHub"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => signInWithProvider("x")}
            disabled={oauthPending !== null}
          >
            {oauthPending === "x" ? "Connecting to X…" : "Continue with X"}
          </Button>

          {displayedOauthError ? (
            <Alert variant="destructive">
              <AlertDescription>{displayedOauthError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex items-center gap-3 py-1">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or continue with email</span>
            <Separator className="flex-1" />
          </div>
        </div>
      ) : null}

      {mode === "signup" ? (
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" name="displayName" required minLength={2} maxLength={80} />
        </div>
      ) : null}

      {mode !== "password" ? (
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
      ) : null}

      {mode !== "reset" ? (
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>
      ) : null}

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

      <Button type="submit" disabled={pending || oauthPending !== null} size="lg" className="w-full">
        {pending ? "Please wait…" : submitLabel}
      </Button>

      {mode === "signin" ? (
        <p className="text-sm text-muted-foreground">
          <Link href="/register" className="text-[var(--accent)] underline-offset-4 hover:underline">
            Create an account
          </Link>
          {" · "}
          <Link href="/forgot-password" className="text-[var(--accent)] underline-offset-4 hover:underline">
            Forgot password
          </Link>
        </p>
      ) : null}

      {mode === "signup" ? (
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent)] underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      ) : null}
    </form>
  );
}
