"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { patronRegisterAction } from "@/lib/actions/patron-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { BotProtectionFields } from "@/components/forms/BotProtectionFields";
import { PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";
import { PATRON_TITLES } from "@/lib/validations/patron";
import { GHANA_REGIONS } from "@/lib/validations/membership";

const EMPTY = {
  title: "",
  fullName: "",
  email: "",
  phone: "",
  occupation: "",
  organization: "",
  jobTitle: "",
  address: "",
  region: "",
  supportInterest: "",
  motivation: "",
};

/**
 * The patron application. Text fields are controlled so a rejected
 * submission (say, an email already in use) doesn't clear everything the
 * person typed — React resets uncontrolled fields whenever a form action
 * finishes. Passwords are the exception and are asked for again.
 */
export function PatronRegisterForm() {
  const [state, formAction, isPending] = useActionState(patronRegisterAction, initialActionState);
  const [values, setValues] = useState(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const fe = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <div role="status" className="rounded-lg border border-success bg-success-light p-6 text-primary-950">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={22} className="text-success shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-2 text-[15px] leading-relaxed">
            <p className="font-display font-bold text-lg">Thank you — your application has been received.</p>
            <p>
              Our team will review it and email you as soon as a decision has been made. Once you&apos;re approved,
              you can sign in to the Patrons&apos; Portal with your email address and the password you chose.
            </p>
            <p>
              <Link href="/" className="font-semibold text-primary-800 underline hover:text-accent-600">
                Back to the homepage
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const field = (name: keyof typeof EMPTY) => ({
    id: `patron-${name}`,
    name,
    value: values[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({ ...prev, [name]: e.target.value })),
    className: inputClasses,
  });

  return (
    <form action={formAction} className="space-y-6">
      <FormAlert message={state.error} />
      <BotProtectionFields />

      <fieldset className="rounded-lg border border-line bg-white p-5 sm:p-6">
        <legend className="px-1 font-display font-bold text-lg text-primary-950">About You</legend>
        <div className="mt-3 grid sm:grid-cols-[9rem_1fr] gap-4">
          <div>
            <Label htmlFor="patron-title">Title</Label>
            <select {...field("title")}>
              <option value="">—</option>
              {PATRON_TITLES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <FieldError messages={fe.title} />
          </div>
          <div>
            <Label htmlFor="patron-fullName" required>Full Name</Label>
            <input {...field("fullName")} required autoComplete="name" maxLength={200} />
            <FieldError messages={fe.fullName} />
          </div>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="patron-email" required>Email Address</Label>
            <input {...field("email")} type="email" required autoComplete="email" maxLength={254} />
            <FieldError messages={fe.email} />
          </div>
          <div>
            <Label htmlFor="patron-phone" required>Telephone Number</Label>
            <input {...field("phone")} type="tel" required autoComplete="tel" placeholder="e.g., 0240000000" />
            <FieldError messages={fe.phone} />
          </div>
          <div>
            <Label htmlFor="patron-address">Town / Address</Label>
            <input {...field("address")} autoComplete="street-address" maxLength={500} />
            <FieldError messages={fe.address} />
          </div>
          <div>
            <Label htmlFor="patron-region">Region</Label>
            <select {...field("region")}>
              <option value="">—</option>
              {GHANA_REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value="Outside Ghana">Outside Ghana</option>
            </select>
            <FieldError messages={fe.region} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-line bg-white p-5 sm:p-6">
        <legend className="px-1 font-display font-bold text-lg text-primary-950">Your Work</legend>
        <div className="mt-3 grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="patron-occupation" required>Occupation / Profession</Label>
            <input {...field("occupation")} required maxLength={200} placeholder="e.g., Lecturer, Medical Doctor, Business Owner" />
            <FieldError messages={fe.occupation} />
          </div>
          <div>
            <Label htmlFor="patron-organization">Organisation / Employer</Label>
            <input {...field("organization")} autoComplete="organization" maxLength={300} />
            <FieldError messages={fe.organization} />
          </div>
          <div>
            <Label htmlFor="patron-jobTitle">Position / Job Title</Label>
            <input {...field("jobTitle")} autoComplete="organization-title" maxLength={200} />
            <FieldError messages={fe.jobTitle} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-line bg-white p-5 sm:p-6">
        <legend className="px-1 font-display font-bold text-lg text-primary-950">Your Support</legend>
        <div className="mt-3 space-y-4">
          <div>
            <Label htmlFor="patron-supportInterest">How would you like to support the association?</Label>
            <textarea
              {...field("supportInterest")}
              rows={3}
              maxLength={5000}
              placeholder="e.g., mentoring students, advocacy, funding, professional advice…"
            />
            <FieldError messages={fe.supportInterest} />
          </div>
          <div>
            <Label htmlFor="patron-motivation">Why would you like to become a patron?</Label>
            <textarea {...field("motivation")} rows={3} maxLength={5000} />
            <FieldError messages={fe.motivation} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-line bg-white p-5 sm:p-6">
        <legend className="px-1 font-display font-bold text-lg text-primary-950">Your Sign-In</legend>
        <p className="mt-2 text-sm text-slate">
          You&apos;ll use your email address and this password to sign in once your application is approved.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="patron-password" required>Password</Label>
            <div className="relative">
              <input
                id="patron-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                className={`${inputClasses} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-light hover:text-slate"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-light">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
            <FieldError messages={fe.password} />
          </div>
          <div>
            <Label htmlFor="patron-confirmPassword" required>Confirm Password</Label>
            <input
              id="patron-confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              className={inputClasses}
            />
            <FieldError messages={fe.confirmPassword} />
          </div>
        </div>
      </fieldset>

      <div className="rounded-lg border border-line bg-white p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-1 h-4 w-4 rounded border-line text-primary-800 focus:ring-primary-600"
          />
          <span className="text-sm text-slate leading-relaxed">
            I confirm the details above are accurate, and I agree that the association may contact me about my
            application and its work.
          </span>
        </label>
        <FieldError messages={fe.consent} />
      </div>

      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending && <Loader2 size={16} className="animate-spin" />}
        {isPending ? "Submitting…" : "Submit Application"}
      </Button>
      <p className="text-center text-sm text-slate">
        Already approved?{" "}
        <Link href="/patrons/login" className="font-semibold text-primary-800 hover:text-accent-600">
          Sign in to the Patrons&apos; Portal
        </Link>
      </p>
    </form>
  );
}
