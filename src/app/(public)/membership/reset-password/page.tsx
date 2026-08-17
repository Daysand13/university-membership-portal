"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { resetPasswordAction } from "@/lib/actions/membership-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FormAlert, FieldError } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialActionState);
  const token = useSearchParams().get("token") ?? "";

  return (
    <div className="bg-surface-muted min-h-[70vh] flex items-center py-16">
      <div className="mx-auto max-w-md w-full px-4 sm:px-6">
        <div className="bg-white rounded-lg border border-line p-8 shadow-sm">
          <h1 className="font-display font-bold text-2xl text-primary-950 text-center">Reset Password</h1>
          <p className="text-sm text-slate text-center mt-1.5">Choose a new password for your account.</p>

          {!token ? (
            <FormAlert message="This reset link is missing its token. Please use the link from your email, or request a new one." />
          ) : (
            <form action={formAction} className="mt-7 space-y-5">
              <FormAlert message={state.error} />
              <input type="hidden" name="token" value={token} />
              <div>
                <Label htmlFor="newPassword" required>New Password</Label>
                <input id="newPassword" name="newPassword" type="password" required className={inputClasses} />
                <p className="text-xs text-slate-light mt-1">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
                <FieldError messages={state.fieldErrors?.newPassword} />
              </div>
              <div>
                <Label htmlFor="confirmNewPassword" required>Confirm New Password</Label>
                <input id="confirmNewPassword" name="confirmNewPassword" type="password" required className={inputClasses} />
                <FieldError messages={state.fieldErrors?.confirmNewPassword} />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending && <Loader2 size={15} className="animate-spin" />}
                {isPending ? "Resetting…" : "Reset Password"}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-slate mt-6">
            <Link href="/membership/login" className="font-semibold text-primary-800 hover:text-accent-600">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
