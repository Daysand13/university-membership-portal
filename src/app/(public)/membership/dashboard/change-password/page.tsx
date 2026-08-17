"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { changeMemberPasswordAction } from "@/lib/actions/membership-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

export default function ChangePasswordPage() {
  const [state, formAction, isPending] = useActionState(changeMemberPasswordAction, initialActionState);

  return (
    <div className="max-w-md">
      <div className="bg-white rounded-lg border border-line p-6 sm:p-7">
        <h2 className="font-display font-bold text-lg text-primary-950 mb-1">Change Password</h2>
        <p className="text-sm text-slate mb-6">
          Choose a strong, unique password you don&apos;t use anywhere else. You&apos;ll stay signed in — this
          page will redirect to your dashboard once it&apos;s done.
        </p>

        <form action={formAction} className="space-y-5">
          <FormAlert message={state.error} />
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
      </div>
    </div>
  );
}
