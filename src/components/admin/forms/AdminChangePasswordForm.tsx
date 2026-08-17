"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { changeAdminPasswordAction } from "@/lib/actions/election-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

export function AdminChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changeAdminPasswordAction, initialActionState);
  const justSaved = state !== initialActionState && !state.error && !state.fieldErrors;

  return (
    <form action={formAction} className="space-y-5 max-w-sm">
      <FormAlert message={state.error} />
      {justSaved && (
        <div className="flex items-center gap-2 text-sm text-success bg-success-light rounded-md px-3.5 py-2.5">
          <CheckCircle2 size={15} /> Password updated.
        </div>
      )}
      <div>
        <Label htmlFor="currentPassword" required>Current Password</Label>
        <input id="currentPassword" name="currentPassword" type="password" required className={inputClasses} />
        <FieldError messages={state.fieldErrors?.currentPassword} />
      </div>
      <div>
        <Label htmlFor="newPassword" required>New Password</Label>
        <input id="newPassword" name="newPassword" type="password" required className={inputClasses} />
        <p className="text-xs text-slate-light mt-1">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
        <FieldError messages={state.fieldErrors?.newPassword} />
      </div>
      <div>
        <Label htmlFor="confirmNewPassword" required>Confirm New Password</Label>
        <input id="confirmNewPassword" name="confirmNewPassword" type="password" required className={inputClasses} />
        <FieldError messages={state.fieldErrors?.confirmNewPassword} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Updating…" : "Update Password"}
      </Button>
    </form>
  );
}
