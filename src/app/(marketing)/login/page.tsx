import { Suspense } from "react";
import { signInAction } from "@/app/auth/actions";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { SetupNotice } from "@/components/auth/setup-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNextPath } from "@/lib/validation";

export const metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <AuthPageShell title="Sign in" description="Access saved builds, inquiries, and your profile.">
      <SetupNotice />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </AuthPageShell>
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
