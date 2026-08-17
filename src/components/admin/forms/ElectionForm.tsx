"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createElectionAction, updateElectionAction } from "@/lib/actions/election-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import type { Election } from "@/generated/prisma/client";

function toDateInputValue(date?: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function ElectionForm({ election }: { election?: Election }) {
  const action = election ? updateElectionAction : createElectionAction;
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      {election && <input type="hidden" name="id" value={election.id} />}

      <div>
        <Label htmlFor="title" required>Election Title</Label>
        <input id="title" name="title" required defaultValue={election?.title} className={inputClasses} />
        <FieldError messages={fe.title} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <textarea id="description" name="description" rows={4} defaultValue={election?.description ?? ""} className={inputClasses} />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="nominationStart">Nominations Open</Label>
          <input id="nominationStart" name="nominationStart" type="date" defaultValue={toDateInputValue(election?.nominationStart)} className={inputClasses} />
        </div>
        <div>
          <Label htmlFor="nominationEnd">Nominations Close</Label>
          <input id="nominationEnd" name="nominationEnd" type="date" defaultValue={toDateInputValue(election?.nominationEnd)} className={inputClasses} />
        </div>
        <div>
          <Label htmlFor="votingDate">Voting Date</Label>
          <input id="votingDate" name="votingDate" type="date" defaultValue={toDateInputValue(election?.votingDate)} className={inputClasses} />
        </div>
        <div>
          <Label htmlFor="venueOrMethod">Venue / Method</Label>
          <input id="venueOrMethod" name="venueOrMethod" defaultValue={election?.venueOrMethod ?? ""} className={inputClasses} />
        </div>
      </div>

      <div>
        <Label htmlFor="resultsSummary">Results Summary (publish once voting concludes)</Label>
        <textarea id="resultsSummary" name="resultsSummary" rows={4} defaultValue={election?.resultsSummary ?? ""} className={inputClasses} />
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" defaultValue={election?.status ?? "DRAFT"} className={`${inputClasses} max-w-xs`}>
          <option value="DRAFT">Draft (not visible to the public)</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Saving…" : election ? "Save Changes" : "Create Election"}
      </Button>
    </form>
  );
}
