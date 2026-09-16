"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { patronLoginAction } from "@/lib/actions/patron-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";

export function PatronLoginForm() {
  const [state, formAction, isPending] = useActionState(patronLoginAction, initialActionState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="patron-login-email" required>Email Address</Label>
        <input
          id="patron-login-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className={inputClasses}
        />
        <FieldError messages={state.fieldErrors?.email} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="patron-login-password" required>Password</Label>
          <Link href="/contact?subject=Patron%20account%20password" className="text-xs font-medium text-primary-800 hover:text-accent-600">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="patron-login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className={`${inputClasses} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-light hover:text-slate"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <FieldError messages={state.fieldErrors?.password} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="rememberMe" className="h-4 w-4 rounded border-line text-primary-800 focus:ring-primary-600" />
        <span className="text-sm text-slate">Remember me</span>
      </label>
      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending && <Loader2 size={16} className="animate-spin" />}
        {isPending ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}
