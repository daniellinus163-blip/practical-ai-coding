import { Suspense } from "react";
import { signInAction } from "@/app/auth/actions";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { SetupNotice } from "@/components/auth/setup-notice";
import { safeNextPath } from "@/lib/validation";

export const metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <h1 className="font-display text-4xl text-[var(--ink)]">Sign in</h1>
      <SetupNotice />
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const oauthError = params.error?.trim() || null;
  return (
    <CredentialsForm
      action={signInAction}
      submitLabel="Sign in"
      mode="signin"
      nextPath={safeNextPath(params.next)}
      oauthError={oauthError}
    />
  );
}
