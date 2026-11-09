import { requestPasswordResetAction } from "@/app/auth/actions";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { SetupNotice } from "@/components/auth/setup-notice";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell title="Reset password" description="We will email a secure link to choose a new password.">
      <SetupNotice />
      <CredentialsForm action={requestPasswordResetAction} submitLabel="Send reset link" mode="reset" />
    </AuthPageShell>
  );
}
