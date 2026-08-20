"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { changeAdminEmailAction } from "@/lib/actions/election-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";

export function AdminEmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, isPending] = useActionState(changeAdminEmailAction, initialActionState);
  const justSaved = state !== initialActionState && !state.error && !state.fieldErrors;

  return (
    <form action={formAction} className="space-y-4 max-w-sm">
      <FormAlert message={state.error} />
      {justSaved && (
        <div className="flex items-center gap-2 text-sm text-success bg-success-light rounded-md px-3.5 py-2.5">
          <CheckCircle2 size={15} /> Email updated. Use your new email next time you log in.
        </div>
      )}
      <div>
        <Label htmlFor="newEmail" required>Email Address</Label>
        <input id="newEmail" name="newEmail" type="email" required defaultValue={currentEmail} className={inputClasses} />
        <FieldError messages={state.fieldErrors?.newEmail} />
      </div>
      <div>
        <Label htmlFor="currentPasswordForEmail" required>Current Password (to confirm)</Label>
        <input
          id="currentPasswordForEmail"
          name="currentPassword"
          type="password"
          required
          className={inputClasses}
        />
        <FieldError messages={state.fieldErrors?.currentPassword} />
      </div>
      <Button type="submit" disabled={isPending} size="sm">
        {isPending && <Loader2 size={14} className="animate-spin" />}
        {isPending ? "Saving…" : "Update Email"}
      </Button>
    </form>
  );
}
