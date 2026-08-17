"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { memberLoginAction } from "@/lib/actions/auth-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";

export default function MemberLoginPage() {
  const [state, formAction, isPending] = useActionState(memberLoginAction, initialActionState);

  return (
    <div className="bg-surface-muted min-h-[70vh] flex items-center py-16">
      <div className="mx-auto max-w-md w-full px-4 sm:px-6">
        <div className="bg-white rounded-lg border border-line p-8 shadow-sm">
          <h1 className="font-display font-bold text-2xl text-primary-950 text-center">Member Login</h1>
          <p className="text-sm text-slate text-center mt-1.5">Sign in with your index number</p>

          <form action={formAction} className="mt-7 space-y-5">
            <FormAlert message={state.error} />
            <div>
              <Label htmlFor="indexNumber" required>Index Number</Label>
              <input id="indexNumber" name="indexNumber" required autoFocus className={`${inputClasses} font-data`} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password" required>Password</Label>
                <Link href="/membership/forgot-password" className="text-xs font-medium text-primary-800 hover:text-accent-600">
                  Forgot password?
                </Link>
              </div>
              <input id="password" name="password" type="password" required className={inputClasses} />
            </div>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending && <Loader2 size={15} className="animate-spin" />}
              {isPending ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate mt-6">
            Not a member yet?{" "}
            <Link href="/membership/enroll" className="font-semibold text-primary-800 hover:text-accent-600">
              Apply for membership
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
