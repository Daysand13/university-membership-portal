"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { updateAlumniCareerAction } from "@/lib/actions/alumni-career-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import type { AlumniProfile } from "@/generated/prisma/client";

export function AlumniCareerForm({ alumni }: { alumni: AlumniProfile }) {
  const [state, formAction, isPending] = useActionState(updateAlumniCareerAction, initialActionState);
  const justSaved = state !== initialActionState && state.success;
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      {justSaved && (
        <div role="status" className="flex items-center gap-2 text-sm text-success bg-success-light rounded-md px-3.5 py-2.5">
          <CheckCircle2 size={15} aria-hidden="true" /> Your career details have been updated.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="currentPosition">Current Position / Job Title</Label>
          <input id="currentPosition" name="currentPosition" defaultValue={alumni.currentPosition ?? ""} className={inputClasses} />
          <FieldError messages={fe.currentPosition} />
        </div>
        <div>
          <Label htmlFor="currentOrganization">Organisation / Employer</Label>
          <input
            id="currentOrganization"
            name="currentOrganization"
            defaultValue={alumni.currentOrganization ?? ""}
            className={inputClasses}
          />
          <FieldError messages={fe.currentOrganization} />
        </div>
        <div>
          <Label htmlFor="profession">Profession</Label>
          <input id="profession" name="profession" defaultValue={alumni.profession ?? ""} className={inputClasses} />
          <FieldError messages={fe.profession} />
        </div>
        <div>
          <Label htmlFor="industry">Industry</Label>
          <input id="industry" name="industry" defaultValue={alumni.industry ?? ""} className={inputClasses} />
          <FieldError messages={fe.industry} />
        </div>
        <div>
          <Label htmlFor="currentLocation">City / Region</Label>
          <input id="currentLocation" name="currentLocation" defaultValue={alumni.currentLocation ?? ""} className={inputClasses} />
          <FieldError messages={fe.currentLocation} />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <input id="country" name="country" defaultValue={alumni.country ?? ""} className={inputClasses} />
          <FieldError messages={fe.country} />
        </div>
        <div>
          <Label htmlFor="linkedinUrl">LinkedIn Profile Link</Label>
          <input
            id="linkedinUrl"
            name="linkedinUrl"
            type="url"
            inputMode="url"
            placeholder="https://www.linkedin.com/in/…"
            defaultValue={alumni.linkedinUrl ?? ""}
            className={inputClasses}
          />
          <FieldError messages={fe.linkedinUrl} />
        </div>
        <div>
          <Label htmlFor="websiteUrl">Personal or Work Website</Label>
          <input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            inputMode="url"
            placeholder="https://…"
            defaultValue={alumni.websiteUrl ?? ""}
            className={inputClasses}
          />
          <FieldError messages={fe.websiteUrl} />
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {isPending ? "Saving…" : "Save Career Details"}
      </Button>
    </form>
  );
}
