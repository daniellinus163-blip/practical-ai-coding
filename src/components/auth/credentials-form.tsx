"use client";

import Link from "next/link";
import type { Provider } from "@supabase/supabase-js";
import { useActionState, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

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

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (nextPath) {
      callbackUrl.searchParams.set("next", nextPath);
    }

    const options: { redirectTo: string; scopes?: string } = {
      redirectTo: callbackUrl.toString(),
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
          <button
            type="button"
            onClick={() => signInWithProvider("github")}
            disabled={oauthPending !== null}
            className="w-full border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] disabled:opacity-60"
          >
            {oauthPending === "github" ? "Connecting to GitHub…" : "Continue with GitHub"}
          </button>

          <button
            type="button"
            onClick={() => signInWithProvider("x")}
            disabled={oauthPending !== null}
            className="w-full border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] disabled:opacity-60"
          >
            {oauthPending === "x" ? "Connecting to X…" : "Continue with X"}
          </button>

          {displayedOauthError ? (
            <p className="text-sm text-[var(--danger)]">{displayedOauthError}</p>
          ) : null}

          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-[var(--line)]" />
            <span className="text-xs text-[var(--muted)]">or continue with email</span>
            <div className="h-px flex-1 bg-[var(--line)]" />
          </div>
        </div>
      ) : null}

      {mode === "signup" ? (
        <label className="block text-sm">
          Display name
          <input
            name="displayName"
            required
            minLength={2}
            maxLength={80}
            className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
          />
        </label>
      ) : null}

      {mode !== "password" ? (
        <label className="block text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
          />
        </label>
      ) : null}

      {mode !== "reset" ? (
        <label className="block text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
          />
        </label>
      ) : null}

      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--ink)]">{state.success}</p> : null}

      <button
        type="submit"
        disabled={pending || oauthPending !== null}
        className="on-dark bg-[var(--ink)] px-4 py-2 text-sm disabled:opacity-60"
      >
        {pending ? "Please wait…" : submitLabel}
      </button>

      {mode === "signin" ? (
        <p className="text-sm text-[var(--muted)]">
          <Link href="/register" className="underline">
            Create an account
          </Link>
          {" · "}
          <Link href="/forgot-password" className="underline">
            Forgot password
          </Link>
        </p>
      ) : null}

      {mode === "signup" ? (
        <p className="text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      ) : null}
    </form>
  );
}
