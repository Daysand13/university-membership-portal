"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { updateAboutAction } from "@/lib/actions/content-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { AboutContent } from "@/generated/prisma/client";

export function AboutContentForm({ about }: { about: AboutContent }) {
  const [state, formAction, isPending] = useActionState(updateAboutAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      {state !== initialActionState && !state.error && (
        <div className="flex items-center gap-2 text-sm text-success bg-success-light rounded-md px-3.5 py-2.5">
          <CheckCircle2 size={15} /> Changes saved. The public About page has been updated.
        </div>
      )}

      <ImageUploadField name="imageUrl" category="OTHER" label="Banner Image" defaultUrl={about.imageUrl} aspect="aspect-[21/9]" />

      <div>
        <Label htmlFor="mission">Mission</Label>
        <textarea id="mission" name="mission" rows={4} defaultValue={about.mission ?? ""} className={inputClasses} />
      </div>
      <div>
        <Label htmlFor="vision">Vision</Label>
        <textarea id="vision" name="vision" rows={4} defaultValue={about.vision ?? ""} className={inputClasses} />
      </div>
      <div>
        <Label htmlFor="coreValues">Core Values</Label>
        <textarea id="coreValues" name="coreValues" rows={4} defaultValue={about.coreValues ?? ""} className={inputClasses} />
      </div>
      <div>
        <Label htmlFor="leadershipMessage">Leadership Message</Label>
        <textarea id="leadershipMessage" name="leadershipMessage" rows={4} defaultValue={about.leadershipMessage ?? ""} className={inputClasses} />
      </div>
      <div>
        <Label htmlFor="history">History</Label>
        <textarea id="history" name="history" rows={5} defaultValue={about.history ?? ""} className={inputClasses} />
      </div>
      <div>
        <Label htmlFor="objectives">Objectives</Label>
        <textarea id="objectives" name="objectives" rows={4} defaultValue={about.objectives ?? ""} className={inputClasses} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
