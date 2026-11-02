import { signUpAction } from "@/app/auth/actions";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { SetupNotice } from "@/components/auth/setup-notice";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <h1 className="font-display text-4xl text-[var(--ink)]">Create account</h1>
      <SetupNotice />
      <CredentialsForm action={signUpAction} submitLabel="Register" mode="signup" />
    </div>
  );
}
