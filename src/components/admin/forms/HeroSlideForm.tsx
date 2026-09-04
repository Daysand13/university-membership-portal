"use client";

import { useRef, useState } from "react";
import { Loader2, Image as ImageIcon, Palette } from "lucide-react";
import { createHeroSlideAction, updateHeroSlideAction } from "@/lib/actions/content-actions";
import { Label, inputClasses } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { HeroSlide } from "@/generated/prisma/client";

const PRESET_COLORS = ["#14153D", "#24266B", "#C9971F", "#FFFFFF", "#F4F1E9", "#7A1F2B"];

export function HeroSlideForm({ slide }: { slide?: HeroSlide }) {
  const [isPending, setIsPending] = useState(false);
  const [background, setBackground] = useState<"image" | "color">(slide?.backgroundColor ? "color" : "image");
  const [color, setColor] = useState(slide?.backgroundColor ?? "#14153D");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    try {
      if (background === "image") {
        formData.set("backgroundColor", "");
      } else {
        formData.set("imageUrl", "");
        formData.set("backgroundColor", color);
      }
      if (slide) {
        await updateHeroSlideAction(slide.id, formData);
      } else {
        await createHeroSlideAction(formData);
        formRef.current?.reset();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid sm:grid-cols-2 gap-4 items-start">
      <div className="sm:col-span-2">
        <Label htmlFor={`title-${slide?.id ?? "new"}`} required>Title</Label>
        <input
          id={`title-${slide?.id ?? "new"}`}
          name="title"
          required
          defaultValue={slide?.title}
          className={inputClasses}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`subtitle-${slide?.id ?? "new"}`}>Subtitle</Label>
        <textarea
          id={`subtitle-${slide?.id ?? "new"}`}
          name="subtitle"
          rows={2}
          defaultValue={slide?.subtitle ?? ""}
          className={inputClasses}
        />
      </div>

      <div className="sm:col-span-2">
        <p className="block text-sm font-medium text-primary-950 mb-1.5">Background</p>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setBackground("image")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium ${
              background === "image" ? "border-primary-800 bg-primary-50 text-primary-800" : "border-line text-slate"
            }`}
          >
            <ImageIcon size={14} /> Image
          </button>
          <button
            type="button"
            onClick={() => setBackground("color")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium ${
              background === "color" ? "border-primary-800 bg-primary-50 text-primary-800" : "border-line text-slate"
            }`}
          >
            <Palette size={14} /> Solid Color
          </button>
        </div>

        {background === "image" ? (
          <ImageUploadField
            name="imageUrl"
            category="HERO"
            label="Slide Image"
            defaultUrl={slide?.imageUrl}
            aspect="aspect-video"
          />
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 rounded border border-line cursor-pointer"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={inputClasses}
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
        <Label htmlFor={`ctaText-${slide?.id ?? "new"}`}>Button Text</Label>
        <input
          id={`ctaText-${slide?.id ?? "new"}`}
          name="ctaText"
          defaultValue={slide?.ctaText ?? ""}
          placeholder="Become a Member"
          className={inputClasses}
        />
      </div>
      <div>
        <Label htmlFor={`ctaUrl-${slide?.id ?? "new"}`}>Button Link</Label>
        <input
          id={`ctaUrl-${slide?.id ?? "new"}`}
          name="ctaUrl"
          defaultValue={slide?.ctaUrl ?? ""}
          placeholder="/membership/enroll"
          className={inputClasses}
        />
      </div>

      <div>
        <Label htmlFor={`order-${slide?.id ?? "new"}`}>Display Order</Label>
        <input
          id={`order-${slide?.id ?? "new"}`}
          name="order"
          type="number"
          defaultValue={slide?.order ?? 0}
          className={inputClasses}
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={slide?.isActive ?? true}
            className="h-4 w-4 rounded border-line text-primary-800"
          />
          Active
        </label>
        <Button type="submit" disabled={isPending} size="sm">
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {isPending ? "Saving…" : slide ? "Update Slide" : "Add Slide"}
        </Button>
      </div>
    </form>
  );
}
