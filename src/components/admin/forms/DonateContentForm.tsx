"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { updateDonateAction } from "@/lib/actions/content-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { DonateContent } from "@/generated/prisma/client";

export function DonateContentForm({ donate }: { donate: DonateContent }) {
  const [state, formAction, isPending] = useActionState(updateDonateAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      {state !== initialActionState && !state.error && (
        <div className="flex items-center gap-2 text-sm text-success bg-success-light rounded-md px-3.5 py-2.5">
          <CheckCircle2 size={15} /> Changes saved. The public Donate page has been updated.
        </div>
      )}

      <div>
        <Label htmlFor="title">Page Title</Label>
        <input id="title" name="title" defaultValue={donate.title ?? ""} className={inputClasses} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <textarea id="description" name="description" rows={3} defaultValue={donate.description ?? ""} className={inputClasses} />
      </div>
      <div>
        <Label htmlFor="instructions">Donation Instructions</Label>
        <textarea id="instructions" name="instructions" rows={3} defaultValue={donate.instructions ?? ""} className={inputClasses} />
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="bankDetails">Bank Details</Label>
          <textarea id="bankDetails" name="bankDetails" rows={4} placeholder="Bank name, account name, account number, branch…" defaultValue={donate.bankDetails ?? ""} className={`${inputClasses} font-data`} />
        </div>
        <div>
          <Label htmlFor="mobileMoneyDetails">Mobile Money Details</Label>
          <textarea id="mobileMoneyDetails" name="mobileMoneyDetails" rows={4} placeholder="Network, number, account name…" defaultValue={donate.mobileMoneyDetails ?? ""} className={`${inputClasses} font-data`} />
        </div>
      </div>
      <ImageUploadField name="qrCodeImageUrl" category="DONATION" label="Donation QR Code" defaultUrl={donate.qrCodeImageUrl} aspect="aspect-square max-w-[200px]" />
      <ImageUploadField name="bannerImageUrl" category="DONATION" label="Banner Image (optional)" defaultUrl={donate.bannerImageUrl} />
      <div>
        <Label htmlFor="paymentGatewayUrl">Payment Gateway URL (optional)</Label>
        <input id="paymentGatewayUrl" name="paymentGatewayUrl" type="url" defaultValue={donate.paymentGatewayUrl ?? ""} className={inputClasses} />
        <FieldError messages={state.fieldErrors?.paymentGatewayUrl} />
      </div>
      <div>
        <Label htmlFor="contactInfo">Donation Contact</Label>
        <input id="contactInfo" name="contactInfo" defaultValue={donate.contactInfo ?? ""} className={inputClasses} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
