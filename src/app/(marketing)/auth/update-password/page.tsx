import { updatePasswordAction } from "@/app/auth/actions";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { SetupNotice } from "@/components/auth/setup-notice";

export const metadata = { title: "New password", robots: { index: false, follow: false } };

export default function UpdatePasswordPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <h1 className="font-display text-4xl text-[var(--ink)]">Set a new password</h1>
      <SetupNotice />
      <CredentialsForm action={updatePasswordAction} submitLabel="Update password" mode="password" />
    </div>
  );
}
