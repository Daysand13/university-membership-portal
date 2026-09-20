"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { setAdminPasswordAction } from "@/lib/actions/admin-permission-actions";
import { initialActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

/**
 * Where an invited administrator chooses their first password — and where
 * one who lost theirs sets a new one, from the same kind of link.
 *
 * The account has no working password until this is done, so the link in
 * their email is the only credential involved at any point.
 */
function SetAdminPasswordForm() {
  const [state, formAction, isPending] = useActionState(setAdminPasswordAction, initialActionState);
  const token = useSearchParams().get("token") ?? "";

  return (
    <div className="min-h-screen bg-surface-muted flex items-center py-16">
      <div className="mx-auto w-full max-w-md px-4 sm:px-6">
        <div className="bg-white rounded-lg border border-line p-8 shadow-sm">
          <h1 className="font-display font-bold text-2xl text-primary-950 text-center">Choose your password</h1>
          <p className="text-sm text-slate text-center mt-1.5">
            For your administrator account on this portal.
          </p>

          {state.success ? (
            <div className="mt-7 text-center">
              <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-success">
                <CheckCircle2 size={18} aria-hidden="true" /> Your password is set.
              </p>
              <Link
                href="/admin/login"
                className="mt-6 block w-full rounded-md bg-primary-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-900"
              >
                Sign in
              </Link>
            </div>
          ) : !token ? (
            <div className="mt-7">
              <FormAlert message="This link is missing its token. Open the link straight from your invitation email, or ask a super administrator to send a new one." />
            </div>
          ) : (
            <form action={formAction} className="mt-7 space-y-5">
              <FormAlert message={state.error} />
              <input type="hidden" name="token" value={token} />
              <div>
                <Label htmlFor="newPassword" required>
                  New password
                </Label>
                <input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" className={inputClasses} />
                <p className="text-xs text-slate-light mt-1">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
                <FieldError messages={state.fieldErrors?.newPassword} />
              </div>
              <div>
                <Label htmlFor="confirmNewPassword" required>
                  Confirm new password
                </Label>
                <input
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  className={inputClasses}
                />
                <FieldError messages={state.fieldErrors?.confirmNewPassword} />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending && <Loader2 size={15} aria-hidden="true" className="animate-spin" />}
                {isPending ? "Saving…" : "Set my password"}
              </Button>
            </form>
          )}
        </div>
        <p className="text-center text-sm text-slate mt-6">
          <Link href="/admin/login" className="font-semibold text-primary-800 hover:text-accent-600">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminSetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-muted" />}>
      <SetAdminPasswordForm />
    </Suspense>
  );
}
