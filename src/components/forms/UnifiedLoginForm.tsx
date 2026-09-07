"use client";

import { useActionState, useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { unifiedLoginAction } from "@/lib/actions/auth-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";

export function UnifiedLoginForm() {
  const [state, formAction, isPending] = useActionState(unifiedLoginAction, initialActionState);
  const [showPassword, setShowPassword] = useState(false);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />

      <div>
        <Label htmlFor="identifier" required>Index Number or Email Address</Label>
        <input
          id="identifier"
          name="identifier"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={inputClasses}
        />
        <p className="mt-1.5 text-xs text-slate-light">
          Students sign in with their index number. Alumni use the email address on their account.
        </p>
        <FieldError messages={fe.identifier} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="password" required>Password</Label>
        </div>
        <div className="relative">
          <input
            id="password"
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
        <FieldError messages={fe.password} />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          name="rememberMe"
          className="h-4 w-4 rounded border-line text-primary-800 focus:ring-primary-600"
        />
        <span className="text-sm text-slate">Remember me</span>
      </label>

      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending && <Loader2 size={16} className="animate-spin" />}
        {isPending ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}
