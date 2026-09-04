"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { updateAlumniProfileAction } from "@/lib/actions/alumni-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import type { AlumniProfile } from "@/generated/prisma/client";

export function AlumniProfileForm({ alumni }: { alumni: AlumniProfile }) {
  const [state, formAction, isPending] = useActionState(updateAlumniProfileAction, initialActionState);
  const justSaved = state !== initialActionState && state.success;
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      {justSaved && (
        <div className="flex items-center gap-2 text-sm text-success bg-success-light rounded-md px-3.5 py-2.5">
          <CheckCircle2 size={15} /> Your profile has been updated.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="fullName" required>Full Name</Label>
          <input id="fullName" name="fullName" defaultValue={alumni.fullName} required className={inputClasses} />
          <FieldError messages={fe.fullName} />
        </div>
        <div>
          <Label htmlFor="phone" required>Phone Number / WhatsApp</Label>
          <input id="phone" name="phone" defaultValue={alumni.phone} required className={inputClasses} />
          <FieldError messages={fe.phone} />
        </div>
        <div>
          <Label htmlFor="profession">Profession / Job Title</Label>
          <input id="profession" name="profession" defaultValue={alumni.profession ?? ""} className={inputClasses} />
        </div>
        <div>
          <Label htmlFor="currentLocation">Current Location / Region</Label>
          <input id="currentLocation" name="currentLocation" defaultValue={alumni.currentLocation ?? ""} className={inputClasses} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="bio">Short Bio</Label>
          <textarea id="bio" name="bio" rows={3} defaultValue={alumni.bio ?? ""} className={inputClasses} />
          <p className="text-xs text-slate-light mt-1">Shown on the Mentorship Board if you&apos;re listed as a mentor.</p>
        </div>
      </div>

      <div className="rounded-lg border border-line p-5 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="directoryVisible"
            defaultChecked={alumni.directoryVisible}
            className="mt-0.5 h-4 w-4 rounded border-line text-primary-800"
          />
          <span className="text-sm text-ink">
            <span className="font-semibold">Visible in the Alumni Directory</span>
            <br />
            <span className="text-slate-light text-xs">Other signed-in alumni can find and see your profile.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="willingToMentor"
            defaultChecked={alumni.willingToMentor}
            className="mt-0.5 h-4 w-4 rounded border-line text-primary-800"
          />
          <span className="text-sm text-ink">
            <span className="font-semibold">Willing to Mentor</span>
            <br />
            <span className="text-slate-light text-xs">Appear on the Mentorship Board for current students and fellow graduates.</span>
          </span>
        </label>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
