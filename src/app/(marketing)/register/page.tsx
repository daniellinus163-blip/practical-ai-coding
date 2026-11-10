import { signUpAction } from "@/app/auth/actions";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { SetupNotice } from "@/components/auth/setup-notice";

export const metadata = { title: "Create account", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return (
    <AuthPageShell title="Create account" description="Save studio builds and track inquiries in one place.">
      <SetupNotice />
      <CredentialsForm action={signUpAction} submitLabel="Register" mode="signup" />
    </AuthPageShell>
  );
}
