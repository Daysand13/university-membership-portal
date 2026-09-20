"use client";

import { useActionState } from "react";
import { KeyRound, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { createExecutiveAccountAction } from "@/lib/actions/admin-permission-actions";
import { initialActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, SavedNotice, inputClasses } from "@/components/ui/Common";
import { ROLE_LABELS, roleLabel } from "@/lib/auth/role-labels";

/**
 * Giving an executive an administrator account, from the same page their
 * listing is edited on.
 *
 * There is no password field: the account is created without one and the
 * person is emailed a link to choose their own.
 */
export function GiveExecutiveAccessForm({
  teamMemberId,
  name,
  memberEmail,
}: {
  teamMemberId: string;
  name: string;
  /** From the linked member account, where the listing has one. */
  memberEmail: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    createExecutiveAccountAction.bind(null, teamMemberId),
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />
      <p className="text-sm text-slate">
        {name} has no administrator account yet, so there is nothing to grant. Create one and they will be emailed a
        link to choose their own password — nobody else ever sees it.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="exec-email" required>
            Email address
          </Label>
          <input
            id="exec-email"
            name="email"
            type="email"
            required
            defaultValue={memberEmail ?? ""}
            className={inputClasses}
          />
          <p className="text-xs text-slate mt-1">
            {memberEmail
              ? "From their linked member account. Change it if they use a different address for association work."
              : "This listing has no linked member account, so type the address their invitation should go to."}
          </p>
          <FieldError messages={fe.email} />
        </div>
        <div>
          <Label htmlFor="exec-role" required>
            Base role
          </Label>
          <select id="exec-role" name="role" defaultValue="MEMBERSHIP_OFFICER" className={inputClasses}>
            {Object.keys(ROLE_LABELS).map((value) => (
              <option key={value} value={value}>
                {roleLabel(value)}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate mt-1">Sets their starting privileges; adjust them here afterwards.</p>
          <FieldError messages={fe.role} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 size={15} aria-hidden="true" className="animate-spin" /> : <UserPlus size={15} aria-hidden="true" />}
          {isPending ? "Creating…" : "Create account and send invitation"}
        </Button>
        <SavedNotice state={state} isPending={isPending}>
          Account created.
        </SavedNotice>
      </div>
    </form>
  );
}

/** Why there is nothing to grant yet, and what to do about it. */
export function NoMemberAccountNotice({ name }: { name: string }) {
  return (
    <p className="flex items-start gap-2.5 rounded-md border border-line bg-surface-muted px-4 py-3 text-sm text-ink">
      <KeyRound size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-primary-800" />
      <span>
        {name} can be given an account with any email address below. Linking their member account above first is
        better where they have one: their dues, their portal badge and their privileges then all follow the same
        person.
      </span>
    </p>
  );
}

/** The heading strip above the grid, saying where this account stands. */
export function ExecutiveAccountStatus({
  email,
  isActive,
  hasSignedIn,
  role,
}: {
  email: string;
  isActive: boolean;
  hasSignedIn: boolean;
  role: string;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate">
      <span className="inline-flex items-center gap-1.5 font-semibold text-primary-950">
        <ShieldCheck size={15} aria-hidden="true" className="text-primary-800" /> {roleLabel(role)}
      </span>
      <span>{email}</span>
      {!isActive && <span className="text-danger">Deactivated, can&apos;t sign in</span>}
      {isActive && !hasSignedIn && <span className="text-accent-700">Hasn&apos;t set a password yet</span>}
    </p>
  );
}
