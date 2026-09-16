"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { changePatronPasswordAction, updatePatronProfileAction } from "@/lib/actions/patron-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";
import { PATRON_TITLES } from "@/lib/validations/patron";
import { GHANA_REGIONS } from "@/lib/validations/membership";

interface PatronDetails {
  title: string;
  fullName: string;
  phone: string;
  occupation: string;
  organization: string;
  jobTitle: string;
  address: string;
  region: string;
}

function Saved({ text }: { text: string }) {
  return (
    <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-success">
      <CheckCircle2 size={15} aria-hidden="true" /> {text}
    </p>
  );
}

export function PatronProfileForm({ initial }: { initial: PatronDetails }) {
  const [state, formAction, isPending] = useActionState(updatePatronProfileAction, initialActionState);
  const [values, setValues] = useState(initial);
  const fe = state.fieldErrors ?? {};

  const field = (name: keyof PatronDetails) => ({
    id: `profile-${name}`,
    name,
    value: values[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [name]: e.target.value })),
    className: inputClasses,
  });

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />
      <div className="grid sm:grid-cols-[9rem_1fr] gap-4">
        <div>
          <Label htmlFor="profile-title">Title</Label>
          <select {...field("title")}>
            <option value="">—</option>
            {PATRON_TITLES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="profile-fullName" required>Full Name</Label>
          <input {...field("fullName")} required maxLength={200} />
          <FieldError messages={fe.fullName} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="profile-phone" required>Telephone Number</Label>
          <input {...field("phone")} type="tel" required />
          <FieldError messages={fe.phone} />
        </div>
        <div>
          <Label htmlFor="profile-occupation" required>Occupation / Profession</Label>
          <input {...field("occupation")} required maxLength={200} />
          <FieldError messages={fe.occupation} />
        </div>
        <div>
          <Label htmlFor="profile-organization">Organisation / Employer</Label>
          <input {...field("organization")} maxLength={300} />
        </div>
        <div>
          <Label htmlFor="profile-jobTitle">Position / Job Title</Label>
          <input {...field("jobTitle")} maxLength={200} />
        </div>
        <div>
          <Label htmlFor="profile-address">Town / Address</Label>
          <input {...field("address")} maxLength={500} />
        </div>
        <div>
          <Label htmlFor="profile-region">Region</Label>
          <select {...field("region")}>
            <option value="">—</option>
            {GHANA_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
            <option value="Outside Ghana">Outside Ghana</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 size={15} className="animate-spin" />}
          {isPending ? "Saving…" : "Save Details"}
        </Button>
        {state.success && !isPending && <Saved text="Your details have been saved." />}
      </div>
    </form>
  );
}

export function PatronPasswordForm() {
  const [state, formAction, isPending] = useActionState(changePatronPasswordAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="currentPassword" required>Current Password</Label>
        <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className={inputClasses} />
        <FieldError messages={fe.currentPassword} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
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
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 size={15} className="animate-spin" />}
          {isPending ? "Changing…" : "Change Password"}
        </Button>
        {state.success && !isPending && <Saved text="Your password has been changed." />}
      </div>
    </form>
  );
}
