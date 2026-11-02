import { requestPasswordResetAction } from "@/app/auth/actions";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { SetupNotice } from "@/components/auth/setup-notice";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <h1 className="font-display text-4xl text-[var(--ink)]">Reset password</h1>
      <SetupNotice />
      <CredentialsForm action={requestPasswordResetAction} submitLabel="Send reset link" mode="reset" />
    </div>
  );
}
