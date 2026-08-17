"use client";

import { useActionState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { adminLoginAction } from "@/lib/actions/auth-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(adminLoginAction, initialActionState);

  return (
    <div className="min-h-screen bg-primary-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-full bg-accent-500 text-primary-950 flex items-center justify-center mb-4">
            <ShieldCheck size={22} />
          </div>
          <h1 className="font-display font-bold text-xl text-white">Admin Sign In</h1>
          <p className="text-sm text-primary-300 mt-1">Acme University Students&apos; Association</p>
        </div>

        <div className="bg-white rounded-lg p-7 shadow-xl">
          <form action={formAction} className="space-y-5">
            <FormAlert message={state.error} />
            <div>
              <Label htmlFor="email" required>Email Address</Label>
              <input id="email" name="email" type="email" required autoFocus className={inputClasses} />
            </div>
            <div>
              <Label htmlFor="password" required>Password</Label>
              <input id="password" name="password" type="password" required className={inputClasses} />
            </div>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending && <Loader2 size={15} className="animate-spin" />}
              {isPending ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </div>
        <p className="text-center text-xs text-primary-400 mt-6">
          This area is restricted to authorized administrators.
        </p>
      </div>
    </div>
  );
}
