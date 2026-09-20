"use client";

import { useActionState, useState } from "react";
import { Loader2, Mail, Plus, UserPlus } from "lucide-react";
import {
  createAdminAccountAction,
  resendAdminInviteAction,
  setAdminActiveAction,
} from "@/lib/actions/admin-permission-actions";
import { initialActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { FieldError, FormAlert, Label, SavedNotice, inputClasses } from "@/components/ui/Common";
import { ROLE_LABELS } from "@/lib/auth/role-labels";

/**
 * Creating a colleague's administrator account.
 *
 * No password field, deliberately: the account is created without one and
 * the person is emailed a link to choose their own. Nobody has to invent a
 * password for somebody else, or send one anywhere.
 */
export function AddAdminForm() {
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (previous: typeof initialActionState, formData: FormData) => {
    const result = await createAdminAccountAction(previous, formData);
    if (result.success) setResetKey((key) => key + 1);
    return result;
  }, initialActionState);
  const fe = state.fieldErrors ?? {};

  if (!open) {
    return (
      <div className="p-4 border-t border-line">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
        >
          <UserPlus size={15} aria-hidden="true" /> Add an administrator
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} key={resetKey} className="p-4 border-t border-line space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate">New administrator</h2>
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="admin-name" required>
          Full name
        </Label>
        <input id="admin-name" name="name" required maxLength={120} className={inputClasses} />
        <FieldError messages={fe.name} />
      </div>
      <div>
        <Label htmlFor="admin-email" required>
          Email address
        </Label>
        <input id="admin-email" name="email" type="email" required className={inputClasses} />
        <p className="text-xs text-slate mt-1">Their invitation goes here, so it has to be an address they read.</p>
        <FieldError messages={fe.email} />
      </div>
      <div>
        <Label htmlFor="admin-role" required>
          Base role
        </Label>
        <select id="admin-role" name="role" defaultValue="EDITOR" className={inputClasses}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate mt-1">You can fine-tune what they can do once the account exists.</p>
        <FieldError messages={fe.role} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 size={15} aria-hidden="true" className="animate-spin" /> : <Plus size={15} aria-hidden="true" />}
          {isPending ? "Creating…" : "Create and send invitation"}
        </Button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-slate hover:text-primary-800">
          Cancel
        </button>
      </div>
      <SavedNotice state={state} isPending={isPending}>
        Account created.
      </SavedNotice>
    </form>
  );
}

/** Sending the invitation again, and switching an account off or back on. */
export function AdminAccountActions({
  adminId,
  name,
  email,
  isActive,
  hasSignedIn,
}: {
  adminId: string;
  name: string;
  email: string;
  isActive: boolean;
  /** Someone who has never signed in is still on their invitation. */
  hasSignedIn: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ConfirmButton
        action={() => resendAdminInviteAction(adminId)}
        confirmMessage={`Email ${email} a fresh link to set their password?\n\nAny earlier link stops working straight away.`}
        className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-surface-muted hover:text-accent-600"
      >
        <Mail size={13} aria-hidden="true" />
        {hasSignedIn ? "Send a password reset link" : "Send the invitation again"}
      </ConfirmButton>
      <ConfirmButton
        action={() => setAdminActiveAction(adminId, !isActive)}
        confirmMessage={
          isActive
            ? `Deactivate ${name}?\n\nThey won't be able to sign in. Everything they have done stays on record, and you can switch them back on later.`
            : `Let ${name} sign in again?`
        }
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
          isActive ? "text-slate hover:bg-surface-muted hover:text-danger" : "border border-line text-primary-800 hover:bg-surface-muted"
        }`}
      >
        {isActive ? "Deactivate account" : "Reactivate account"}
      </ConfirmButton>
    </div>
  );
}
