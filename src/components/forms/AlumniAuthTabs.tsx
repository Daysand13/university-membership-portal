"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { alumniLoginAction, alumniRegisterAction } from "@/lib/actions/auth-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

function SignInForm() {
  const [state, formAction, isPending] = useActionState(alumniLoginAction, initialActionState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="signin-email" required>Email Address</Label>
        <input id="signin-email" name="email" type="email" required autoFocus className={inputClasses} />
        <FieldError messages={state.fieldErrors?.email} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="signin-password" required>Password</Label>
          <Link href="/alumni/forgot-password" className="text-xs font-medium text-primary-800 hover:text-accent-600">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="signin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            className={`${inputClasses} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-light hover:text-slate"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <FieldError messages={state.fieldErrors?.password} />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate cursor-pointer">
        <input type="checkbox" name="rememberMe" className="h-4 w-4 rounded border-line text-primary-800" />
        Remember me
      </label>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Signing in…" : "Login to Portal"}
      </Button>
    </form>
  );
}

function RegisterForm() {
  const [state, formAction, isPending] = useActionState(alumniRegisterAction, initialActionState);
  const [showPassword, setShowPassword] = useState(false);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-light mb-3">
          Personal & Contact Information
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="reg-fullName" required>Full Name</Label>
            <input id="reg-fullName" name="fullName" required className={inputClasses} />
            <FieldError messages={fe.fullName} />
          </div>
          <div>
            <Label htmlFor="reg-email" required>Email Address</Label>
            <input id="reg-email" name="email" type="email" required className={inputClasses} />
            <FieldError messages={fe.email} />
          </div>
          <div>
            <Label htmlFor="reg-phone" required>Phone Number / WhatsApp</Label>
            <input id="reg-phone" name="phone" type="tel" required placeholder="e.g., 0240000000" className={inputClasses} />
            <FieldError messages={fe.phone} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-light mb-3">
          Academic Background (UEW)
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reg-graduationYear" required>Graduation Year</Label>
            <input
              id="reg-graduationYear"
              name="graduationYear"
              type="number"
              min="1960"
              max="2100"
              required
              className={inputClasses}
            />
            <FieldError messages={fe.graduationYear} />
          </div>
          <div>
            <Label htmlFor="reg-programme" required>Program of Study</Label>
            <input id="reg-programme" name="programme" required className={inputClasses} />
            <FieldError messages={fe.programme} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-light mb-3">
          Current Professional Status
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reg-profession">Profession / Job Title</Label>
            <input id="reg-profession" name="profession" className={inputClasses} />
          </div>
          <div>
            <Label htmlFor="reg-currentLocation">Current Location / Region</Label>
            <input id="reg-currentLocation" name="currentLocation" className={inputClasses} />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="reg-password" required>Choose a Password</Label>
        <div className="relative">
          <input
            id="reg-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            className={`${inputClasses} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-light hover:text-slate"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-xs text-slate-light mt-1">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
        <FieldError messages={fe.password} />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 rounded border-line text-primary-800" />
        <span className="text-sm text-slate leading-relaxed">
          I agree to join the Association of Students with Special Needs alumni network and permit my professional
          details to be visible in the secure directory.
        </span>
      </label>
      <FieldError messages={fe.consent} />

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Submitting…" : "Submit Registration"}
      </Button>
    </form>
  );
}

export function AlumniAuthTabs({ initialTab = "signin" }: { initialTab?: "signin" | "register" }) {
  const [tab, setTab] = useState<"signin" | "register">(initialTab);

  return (
    <div className="bg-white rounded-lg border border-line p-6 sm:p-8 shadow-sm">
      <div className="grid grid-cols-2 rounded-md border border-line p-1 mb-7 bg-surface-muted">
        <button
          type="button"
          onClick={() => setTab("signin")}
          className={`rounded px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "signin" ? "bg-white text-primary-950 shadow-sm" : "text-slate hover:text-primary-800"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setTab("register")}
          className={`rounded px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "register" ? "bg-white text-primary-950 shadow-sm" : "text-slate hover:text-primary-800"
          }`}
        >
          Register New Account
        </button>
      </div>

      {tab === "signin" ? <SignInForm /> : <RegisterForm />}
    </div>
  );
}
