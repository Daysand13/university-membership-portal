"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { forgotPasswordAction } from "@/lib/actions/membership-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialActionState);

  return (
    <div className="bg-surface-muted min-h-[70vh] flex items-center py-16">
      <div className="mx-auto max-w-md w-full px-4 sm:px-6">
        <div className="bg-white rounded-lg border border-line p-8 shadow-sm">
          {state.success ? (
            <div className="text-center">
              <MailCheck size={30} className="mx-auto text-success mb-3" />
              <h1 className="font-display font-bold text-xl text-primary-950">Check your email</h1>
              <p className="text-sm text-slate mt-2 leading-relaxed">
                If an account exists for that email address, we&apos;ve sent a link to reset your password. It
                expires in 30 minutes.
              </p>
              <Link href="/membership/login" className="inline-block mt-6 text-sm font-semibold text-primary-800 hover:text-accent-600">
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl text-primary-950 text-center">Forgot Password</h1>
              <p className="text-sm text-slate text-center mt-1.5">
                Enter your registered email and we&apos;ll send you a reset link.
              </p>
              <form action={formAction} className="mt-7 space-y-5">
                <FormAlert message={state.error} />
                <div>
                  <Label htmlFor="email" required>Email Address</Label>
                  <input id="email" name="email" type="email" required autoFocus className={inputClasses} />
                </div>
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending && <Loader2 size={15} className="animate-spin" />}
                  {isPending ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>
              <p className="text-center text-sm text-slate mt-6">
                <Link href="/membership/login" className="font-semibold text-primary-800 hover:text-accent-600">
                  Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
