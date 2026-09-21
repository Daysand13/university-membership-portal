"use client";

import { useActionState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { SuccessDialog, useResettableForm } from "@/components/ui/SuccessDialog";
import { submitNominationAction } from "@/lib/actions/ballot-actions";
import { initialActionState } from "@/lib/actions/types";

/**
 * Standing for office, from a member's own dashboard.
 *
 * Only shown when they can actually stand — nominations open, dues paid,
 * nothing already in. Everything written here goes to the Electoral
 * Commission, and the member is told plainly that it is their decision.
 */
export function NominationForm({
  electionId,
  positions,
}: {
  electionId: string;
  positions: { id: string; title: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    submitNominationAction.bind(null, electionId),
    initialActionState,
  );
  const { formKey, formRef, resetForm } = useResettableForm();
  const fe = state.fieldErrors ?? {};

  return (
    <>
      <form ref={formRef} key={formKey} action={formAction} className="space-y-4">
        <FormAlert message={state.error} />
        <div>
          <Label htmlFor="positionId" required>
            The post you are standing for
          </Label>
          <select id="positionId" name="positionId" className={inputClasses}>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.title}
              </option>
            ))}
          </select>
          <FieldError messages={fe.positionId} />
        </div>
        <div>
          <Label htmlFor="manifesto" required>
            What you would do in the post
          </Label>
          <textarea
            id="manifesto"
            name="manifesto"
            rows={6}
            maxLength={3000}
            className={inputClasses}
            placeholder="What you want to change, and how. This is what members read beside your name on the ballot."
          />
          <FieldError messages={fe.manifesto} />
          <p className="text-xs text-slate mt-1">
            Shown to every voter at the terminal, and read aloud by a screen reader, so write it as you would say it.
          </p>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
          {isPending ? "Sending…" : "Put my name forward"}
        </Button>
      </form>

      <SuccessDialog
        state={state}
        isPending={isPending}
        title="Your nomination is in"
        againLabel="Close"
        againIcon={<Check size={16} aria-hidden="true" />}
        onAgain={resetForm}
        listHref="/membership/dashboard/elections"
        listLabel="Back to the election"
      />
    </>
  );
}
