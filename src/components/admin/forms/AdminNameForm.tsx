"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { updateAdminNameAction } from "@/lib/actions/election-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";

export function AdminNameForm({ currentName }: { currentName: string }) {
  const [state, formAction, isPending] = useActionState(updateAdminNameAction, initialActionState);
  const justSaved = state !== initialActionState && !state.error && !state.fieldErrors;

  return (
    <form action={formAction} className="space-y-4 max-w-sm">
      <FormAlert message={state.error} />
      {justSaved && (
        <div className="flex items-center gap-2 text-sm text-success bg-success-light rounded-md px-3.5 py-2.5">
          <CheckCircle2 size={15} /> Name updated.
        </div>
      )}
      <div>
        <Label htmlFor="name" required>Display Name</Label>
        <input id="name" name="name" required defaultValue={currentName} className={inputClasses} />
        <FieldError messages={state.fieldErrors?.name} />
      </div>
      <Button type="submit" disabled={isPending} size="sm">
        {isPending && <Loader2 size={14} className="animate-spin" />}
        {isPending ? "Saving…" : "Save Name"}
      </Button>
    </form>
  );
}
