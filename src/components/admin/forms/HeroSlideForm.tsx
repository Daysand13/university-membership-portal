"use client";

import { useActionState, useState } from "react";
import { Loader2, Image as ImageIcon, Palette } from "lucide-react";
import { createHeroSlideAction, updateHeroSlideAction } from "@/lib/actions/content-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert, SavedNotice } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { HeroSlide } from "@/generated/prisma/client";

const PRESET_COLORS = ["#14153D", "#24266B", "#C9971F", "#FFFFFF", "#F4F1E9", "#7A1F2B"];

export function HeroSlideForm({ slide }: { slide?: HeroSlide }) {
  const action = slide ? updateHeroSlideAction.bind(null, slide.id) : createHeroSlideAction;
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const [background, setBackground] = useState<"image" | "color">(slide?.backgroundColor ? "color" : "image");
  const [color, setColor] = useState(slide?.backgroundColor ?? "#14153D");
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid sm:grid-cols-2 gap-4 items-start">
      <div className="sm:col-span-2">
        <FormAlert message={state.error} />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="title" required>
          Title
        </Label>
        <input id="title" name="title" required defaultValue={slide?.title} className={inputClasses} />
        <FieldError messages={fe.title} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <textarea id="subtitle" name="subtitle" rows={2} defaultValue={slide?.subtitle ?? ""} className={inputClasses} />
      </div>

      <div className="sm:col-span-2">
        <p className="block text-sm font-medium text-primary-950 mb-1.5">Background</p>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            aria-pressed={background === "image"}
            onClick={() => setBackground("image")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium ${
              background === "image" ? "border-primary-800 bg-primary-50 text-primary-800" : "border-line text-slate"
            }`}
          >
            <ImageIcon size={14} aria-hidden="true" /> Image
          </button>
          <button
            type="button"
            aria-pressed={background === "color"}
            onClick={() => setBackground("color")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium ${
              background === "color" ? "border-primary-800 bg-primary-50 text-primary-800" : "border-line text-slate"
            }`}
          >
            <Palette size={14} aria-hidden="true" /> Solid Color
          </button>
        </div>

        {/* Only the chosen background is submitted; the other is cleared. */}
        {background === "image" ? (
          <>
            <input type="hidden" name="backgroundColor" value="" />
            <ImageUploadField
              name="imageUrl"
              category="HERO"
              label="Slide Image"
              defaultUrl={slide?.imageUrl}
              aspect="aspect-video"
            />
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="imageUrl" value="" />
            <label className="sr-only" htmlFor="backgroundColorPicker">
              Background colour
            </label>
            <input
              id="backgroundColorPicker"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 rounded border border-line cursor-pointer"
            />
            <input
              name="backgroundColor"
              aria-label="Background colour code"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={`${inputClasses} max-w-[9rem]`}
              placeholder="#14153D"
            />
            <div className="flex gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Use ${c}`}
                  className="w-6 h-6 rounded-full border border-line"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
        <p className="mt-1.5 text-xs text-slate-light">
          Text color automatically switches between light and dark for readability against the chosen background.
        </p>
      </div>

      <div>
        <Label htmlFor="ctaText">Button Text</Label>
        <input id="ctaText" name="ctaText" defaultValue={slide?.ctaText ?? ""} placeholder="Become a Member" className={inputClasses} />
      </div>
      <div>
        <Label htmlFor="ctaUrl">Button Link</Label>
        <input id="ctaUrl" name="ctaUrl" defaultValue={slide?.ctaUrl ?? ""} placeholder="/membership/enroll" className={inputClasses} />
      </div>

      <div>
        <Label htmlFor="order">Display Order</Label>
        <input id="order" name="order" type="number" defaultValue={slide?.order ?? 0} className={inputClasses} />
        <p className="mt-1.5 text-xs text-slate-light">Slides run from the lowest number to the highest.</p>
      </div>
      <div className="flex items-end pb-2.5">
        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={slide?.isActive ?? true}
            className="h-4 w-4 rounded border-line text-primary-800"
          />
          Show this slide on the homepage
        </label>
      </div>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {isPending ? "Saving…" : slide ? "Update Slide" : "Add Slide"}
        </Button>
        <SavedNotice state={state} isPending={isPending}>
          Saved. The homepage banner is up to date.
        </SavedNotice>
      </div>
    </form>
  );
}
