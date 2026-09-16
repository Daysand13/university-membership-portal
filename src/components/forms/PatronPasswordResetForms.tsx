"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { patronForgotPasswordAction, patronResetPasswordAction } from "@/lib/actions/patron-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

export function PatronForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(patronForgotPasswordAction, initialActionState);

  if (state.success) {
    return (
      <div role="status" className="text-center">
        <MailCheck size={30} className="mx-auto text-success mb-3" aria-hidden="true" />
        <h2 className="font-display font-bold text-xl text-primary-950">Check your email</h2>
        <p className="text-sm text-slate mt-2 leading-relaxed">
          If a patron account uses that email address, we&apos;ve sent it a link to reset the password. The link
          expires in 30 minutes. Don&apos;t forget to check your spam folder.
        </p>
        <Link href="/patrons/login" className="inline-block mt-6 text-sm font-semibold text-primary-800 hover:text-accent-600">
          Back to Patron Sign In
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="patron-forgot-email" required>Email Address</Label>
        <input
          id="patron-forgot-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          className={inputClasses}
        />
        <FieldError messages={state.fieldErrors?.email} />
      </div>
      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending && <Loader2 size={16} className="animate-spin" />}
        {isPending ? "Sending…" : "Send Reset Link"}
      </Button>
    </form>
  );
}

export function PatronResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(patronResetPasswordAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      <input type="hidden" name="token" value={token} />
      <div>
        <Label htmlFor="newPassword" required>New Password</Label>
        <input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" className={inputClasses} />
        <p className="mt-1 text-xs text-slate-light">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
        <FieldError messages={fe.newPassword} />
      </div>
      <div>
        <Label htmlFor="confirmNewPassword" required>Confirm New Password</Label>
        <input id="confirmNewPassword" name="confirmNewPassword" type="password" required autoComplete="new-password" className={inputClasses} />
        <FieldError messages={fe.confirmNewPassword} />
      </div>
      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending && <Loader2 size={16} className="animate-spin" />}
        {isPending ? "Saving…" : "Set New Password"}
      </Button>
    </form>
  );
}
