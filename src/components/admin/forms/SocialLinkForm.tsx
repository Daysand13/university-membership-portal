"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { upsertSocialLinkAction } from "@/lib/actions/content-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import type { SocialLink } from "@/generated/prisma/client";

const PLATFORMS = ["FACEBOOK", "INSTAGRAM", "TWITTER", "TIKTOK", "YOUTUBE", "LINKEDIN", "WHATSAPP", "TELEGRAM", "CUSTOM"];

export function SocialLinkForm({ link }: { link?: SocialLink }) {
  const [state, formAction, isPending] = useActionState(upsertSocialLinkAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid sm:grid-cols-2 gap-4 items-end">
      {link && <input type="hidden" name="id" value={link.id} />}
      <div className="sm:col-span-2">
        <FormAlert message={state.error} />
      </div>
      <div>
        <Label htmlFor="platform" required>Platform</Label>
        <select id="platform" name="platform" required defaultValue={link?.platform ?? "FACEBOOK"} className={inputClasses}>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="displayName" required>Display Name</Label>
        <input id="displayName" name="displayName" required defaultValue={link?.displayName} placeholder="e.g. Facebook" className={inputClasses} />
        <FieldError messages={fe.displayName} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="url" required>URL</Label>
        <input id="url" name="url" type="url" required defaultValue={link?.url} placeholder="https://facebook.com/yourpage" className={inputClasses} />
        <FieldError messages={fe.url} />
      </div>
      <div>
        <Label htmlFor="order">Display Order</Label>
        <input id="order" name="order" type="number" defaultValue={link?.order ?? 0} className={inputClasses} />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
          <input type="checkbox" name="isActive" defaultChecked={link?.isActive ?? true} className="h-4 w-4 rounded border-line text-primary-800" />
          Active
        </label>
        <Button type="submit" disabled={isPending} size="sm">
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {isPending ? "Saving…" : link ? "Update Link" : "Add Link"}
        </Button>
      </div>
    </form>
  );
}
