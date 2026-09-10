"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Star } from "lucide-react";
import { saveAlumniSpotlightAction } from "@/lib/actions/alumni-showcase-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { AlumniProfile, AlumniSpotlight } from "@/generated/prisma/client";

const textareaClasses = `${inputClasses} min-h-[120px] leading-relaxed`;

/**
 * The "Feature this alumnus" editor. Writes to the spotlight attached to an
 * existing alumni account — it never creates a second record for the same
 * person, which is why this form takes an alumnus rather than collecting
 * their name and graduation year again.
 */
export function AlumniSpotlightForm({
  alumni,
}: {
  alumni: AlumniProfile & { spotlight: AlumniSpotlight | null };
}) {
  const [state, formAction, isPending] = useActionState(saveAlumniSpotlightAction, initialActionState);
  const s = alumni.spotlight;
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <FormAlert message={state.error} />
      {state.success && (
        <div className="rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
          Spotlight saved.{" "}
          {alumni.publicSlug && (
            <Link href={`/alumni/${alumni.publicSlug}`} className="underline font-semibold">
              View public profile
            </Link>
          )}
        </div>
      )}
      <input type="hidden" name="alumniId" value={alumni.id} />

      <div className="bg-white rounded-lg border border-line p-6 space-y-5">
        <h2 className="font-display font-bold text-base text-primary-950">Spotlight content</h2>

        <div>
          <Label htmlFor="headline">Featured headline</Label>
          <input
            id="headline"
            name="headline"
            defaultValue={s?.headline ?? ""}
            placeholder="e.g. Building accessible technology for Ghanaian classrooms"
            className={inputClasses}
          />
          <FieldError messages={fe.headline} />
        </div>

        <div>
          <Label htmlFor="summary">Achievement summary</Label>
          <textarea
            id="summary"
            name="summary"
            defaultValue={s?.summary ?? ""}
            placeholder="One or two sentences shown on the alumni card."
            className={textareaClasses}
          />
          <FieldError messages={fe.summary} />
        </div>

        <div>
          <Label htmlFor="story">Full spotlight story</Label>
          <textarea
            id="story"
            name="story"
            defaultValue={s?.story ?? ""}
            placeholder="The longer story shown on their profile page — career journey, achievements, advice to current students."
            className={`${textareaClasses} min-h-[220px]`}
          />
          <FieldError messages={fe.story} />
        </div>

        <div>
          <Label htmlFor="quote">Quote (optional)</Label>
          <textarea
            id="quote"
            name="quote"
            defaultValue={s?.quote ?? ""}
            placeholder="A short quote in their own words."
            className={textareaClasses}
          />
          <FieldError messages={fe.quote} />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="category">Achievement category</Label>
            <input
              id="category"
              name="category"
              defaultValue={s?.category ?? ""}
              placeholder="e.g. Technology, Education, Public Service"
              className={inputClasses}
            />
            <FieldError messages={fe.category} />
          </div>
          <div>
            <Label htmlFor="displayOrder">Display order</Label>
            <input
              id="displayOrder"
              name="displayOrder"
              type="number"
              min={0}
              defaultValue={s?.displayOrder ?? 0}
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-slate-light">Lower numbers appear first.</p>
            <FieldError messages={fe.displayOrder} />
          </div>
        </div>

        <ImageUploadField
          name="imageUrl"
          category="PROFILE"
          label="Featured image (optional)"
          defaultUrl={s?.imageUrl}
          aspect="aspect-square"
        />
        <p className="-mt-2 text-xs text-slate-light">
          Leave empty to use their own profile photo.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-line p-6 space-y-4">
        <h2 className="font-display font-bold text-base text-primary-950">Publishing</h2>

        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="published"
            defaultChecked={s?.published ?? false}
            className="mt-0.5 w-4 h-4 accent-[var(--color-primary-800)]"
          />
          <span>
            <strong className="font-semibold">Publish to the Alumni page</strong>
            <span className="block text-xs text-slate mt-0.5">
              Until this is ticked, the spotlight is a draft and no visitor can see it. Ticking it also
              makes this alumnus&apos;s public profile page reachable.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="showOnHomepage"
            defaultChecked={s?.showOnHomepage ?? false}
            className="mt-0.5 w-4 h-4 accent-[var(--color-primary-800)]"
          />
          <span>
            <strong className="font-semibold">Also show on the homepage</strong>
            <span className="block text-xs text-slate mt-0.5">
              Includes them in the &quot;Our Proud Alumni&quot; strip on the front page.
            </span>
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 size={15} className="animate-spin" />}
          <Star size={15} /> Save spotlight
        </Button>
        <Link href="/admin/alumni" className="text-sm text-slate hover:text-primary-800">
          Back to alumni
        </Link>
      </div>
    </form>
  );
}
