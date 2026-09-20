"use client";

import { useActionState, useState } from "react";
import { Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { saveAdminPermissionsAction } from "@/lib/actions/admin-permission-actions";
import { initialActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/Button";
import { FormAlert, Label, SavedNotice, inputClasses } from "@/components/ui/Common";
import { CAPABILITY_MODULES, ROLE_DEFAULTS } from "@/lib/auth/capabilities";
import { AdminRole } from "@/generated/prisma/enums";
import { ROLE_LABELS, roleLabel } from "@/lib/auth/role-labels";

export interface PermissionTarget {
  id: string;
  name: string;
  email: string;
  role: string;
  capabilities: string[];
}

/**
 * The permission grid for one account: a base role that sets the defaults,
 * and a toggle per capability that can grant or withhold any one of them.
 *
 * Changing the base role re-ticks the grid to that role's defaults, so what
 * is on screen is always a real, consistent set of permissions rather than
 * the previous role's answers wearing a new label.
 */
export function PermissionManager({ target }: { target: PermissionTarget }) {
  const [state, formAction, isPending] = useActionState(saveAdminPermissionsAction, initialActionState);
  const [role, setRole] = useState(target.role);
  const [granted, setGranted] = useState<Set<string>>(new Set(target.capabilities));

  const isSuperAdmin = role === AdminRole.SUPER_ADMIN;
  const defaults = new Set(ROLE_DEFAULTS[role as AdminRole] ?? []);

  function applyRole(nextRole: string) {
    setRole(nextRole);
    setGranted(new Set(ROLE_DEFAULTS[nextRole as AdminRole] ?? []));
  }

  function toggle(key: string, on: boolean) {
    setGranted((current) => {
      const next = new Set(current);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="adminId" value={target.id} />
      <FormAlert message={state.error} />

      <div className="bg-white rounded-lg border border-line p-6 space-y-5">
        <div className="max-w-sm">
          <Label htmlFor="role" required>
            Base role
          </Label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => applyRole(e.target.value)}
            className={inputClasses}
          >
            {Object.keys(ROLE_LABELS).map((value) => (
              <option key={value} value={value}>
                {roleLabel(value)}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate mt-1.5">
            Sets the defaults below. Change any of them afterwards for this person only.
          </p>
        </div>

        {isSuperAdmin ? (
          <p className="flex items-start gap-2.5 rounded-md border border-line bg-surface-muted px-4 py-3 text-sm text-ink">
            <ShieldCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-primary-800" />
            A super administrator can do everything, including managing these permissions. There is nothing to
            switch off — choose a different base role first if this account should be limited.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => applyRole(role)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
          >
            <RotateCcw size={14} aria-hidden="true" /> Reset to the defaults for {roleLabel(role)}
          </button>
        )}
      </div>

      {!isSuperAdmin &&
        CAPABILITY_MODULES.map((group) => (
          <fieldset key={group.key} className="bg-white rounded-lg border border-line p-6">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate">{group.title}</legend>
            <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2 mt-2">
              {group.capabilities.map((capability) => {
                const on = granted.has(capability.key);
                const changed = on !== defaults.has(capability.key);
                return (
                  <label key={capability.key} className="flex items-start gap-3 text-sm text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      name="capability"
                      value={capability.key}
                      checked={on}
                      onChange={(e) => toggle(capability.key, e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-line text-primary-800 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-primary-950">{capability.label}</span>
                      {changed && (
                        <span className="ml-2 rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-primary-950">
                          {on ? "Added" : "Removed"}
                        </span>
                      )}
                      {capability.hint && <span className="block text-xs text-slate mt-0.5">{capability.hint}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 size={15} aria-hidden="true" className="animate-spin" />}
          {isPending ? "Saving…" : "Save executive privileges"}
        </Button>
        <SavedNotice state={state} isPending={isPending}>
          Saved.
        </SavedNotice>
      </div>
    </form>
  );
}
