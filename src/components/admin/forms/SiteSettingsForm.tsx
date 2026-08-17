"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { updateSiteSettingsAction } from "@/lib/actions/content-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { SiteSettingsInput } from "@/lib/validations/content";

export function SiteSettingsForm({ settings }: { settings: SiteSettingsInput }) {
  const [state, formAction, isPending] = useActionState(updateSiteSettingsAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      <FormAlert message={state.error} />
      {state !== initialActionState && !state.error && (
        <div className="flex items-center gap-2 text-sm text-success bg-success-light rounded-md px-3.5 py-2.5">
          <CheckCircle2 size={15} /> Settings saved.
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-primary-950 mb-4">Branding</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <Label htmlFor="siteTitle" required>Site Title</Label>
            <input id="siteTitle" name="siteTitle" required defaultValue={settings.siteTitle} className={inputClasses} />
            <FieldError messages={fe.siteTitle} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="footerDescription">Footer Description</Label>
            <textarea id="footerDescription" name="footerDescription" rows={2} defaultValue={settings.footerDescription} className={inputClasses} />
          </div>
          <ImageUploadField name="logoUrl" category="LOGO" label="Logo" defaultUrl={settings.logoUrl} aspect="aspect-video max-w-[240px]" />
          <ImageUploadField name="faviconUrl" category="LOGO" label="Favicon" defaultUrl={settings.faviconUrl} aspect="aspect-square max-w-[100px]" />
          <div className="sm:col-span-2">
            <Label htmlFor="copyrightText">Copyright Text</Label>
            <input id="copyrightText" name="copyrightText" defaultValue={settings.copyrightText} className={inputClasses} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-primary-950 mb-4">Contact Information</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="generalEmail">General Email</Label>
            <input id="generalEmail" name="generalEmail" type="email" defaultValue={settings.generalEmail} className={inputClasses} />
            <FieldError messages={fe.generalEmail} />
          </div>
          <div>
            <Label htmlFor="membershipEmail">Membership Email</Label>
            <input id="membershipEmail" name="membershipEmail" type="email" defaultValue={settings.membershipEmail} className={inputClasses} />
          </div>
          <div>
            <Label htmlFor="adminEmail">Admin Email</Label>
            <input id="adminEmail" name="adminEmail" type="email" defaultValue={settings.adminEmail} className={inputClasses} />
          </div>
          <div>
            <Label htmlFor="officeHours">Office Hours</Label>
            <input id="officeHours" name="officeHours" defaultValue={settings.officeHours} className={inputClasses} />
          </div>
          <div>
            <Label htmlFor="phonePrimary">Primary Phone</Label>
            <input id="phonePrimary" name="phonePrimary" defaultValue={settings.phonePrimary} className={inputClasses} />
          </div>
          <div>
            <Label htmlFor="phoneSecondary">Secondary Phone</Label>
            <input id="phoneSecondary" name="phoneSecondary" defaultValue={settings.phoneSecondary} className={inputClasses} />
          </div>
          <div>
            <Label htmlFor="physicalAddress">Physical Address</Label>
            <input id="physicalAddress" name="physicalAddress" defaultValue={settings.physicalAddress} className={inputClasses} />
          </div>
          <div>
            <Label htmlFor="postalAddress">Postal Address</Label>
            <input id="postalAddress" name="postalAddress" defaultValue={settings.postalAddress} className={inputClasses} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="mapEmbedUrl">Google Maps Embed URL</Label>
            <input id="mapEmbedUrl" name="mapEmbedUrl" type="url" defaultValue={settings.mapEmbedUrl} className={inputClasses} />
            <FieldError messages={fe.mapEmbedUrl} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-primary-950 mb-4">Email Delivery</h2>
        <p className="text-xs text-slate bg-surface-muted rounded-md px-3.5 py-3">
          The transactional email provider (Resend) is configured through the <code className="font-data">RESEND_API_KEY</code> and{" "}
          <code className="font-data">EMAIL_FROM</code> environment variables, not here — that keeps provider credentials out of the
          database. See the README for setup instructions.
        </p>
      </section>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Saving…" : "Save Settings"}
      </Button>
    </form>
  );
}
