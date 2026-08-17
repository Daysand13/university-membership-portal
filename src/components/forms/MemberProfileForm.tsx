"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { updateMemberProfileAction } from "@/lib/actions/membership-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import type { Member } from "@/generated/prisma/client";

export function MemberProfileForm({ member }: { member: Member }) {
  const [state, formAction, isPending] = useActionState(updateMemberProfileAction, initialActionState);
  const justSaved = state !== initialActionState && !state.error && !state.fieldErrors;

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      {justSaved && (
        <div className="flex items-center gap-2 text-sm text-success bg-success-light rounded-md px-3.5 py-2.5">
          <CheckCircle2 size={15} /> Your details have been updated.
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="phone" required>Phone Number</Label>
          <input id="phone" name="phone" defaultValue={member.phone} required className={inputClasses} />
          <FieldError messages={state.fieldErrors?.phone} />
        </div>
        <div>
          <Label htmlFor="region">Region</Label>
          <input id="region" name="region" defaultValue={member.region ?? ""} className={inputClasses} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="residentialAddress">Residential Address</Label>
          <input
            id="residentialAddress"
            name="residentialAddress"
            defaultValue={member.residentialAddress ?? ""}
            className={inputClasses}
          />
        </div>
        <div>
          <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
          <input
            id="emergencyContactName"
            name="emergencyContactName"
            defaultValue={member.emergencyContactName ?? ""}
            className={inputClasses}
          />
        </div>
        <div>
          <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
          <input
            id="emergencyContactPhone"
            name="emergencyContactPhone"
            defaultValue={member.emergencyContactPhone ?? ""}
            className={inputClasses}
          />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
