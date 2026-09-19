"use client";

import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, SavedNotice, inputClasses } from "@/components/ui/Common";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import {
  saveAllyAction,
  saveAlliesSettingsAction,
  saveAssistiveSettingsAction,
  saveSoftwareAction,
  updateSoftwareRequestAction,
} from "@/lib/actions/outreach-admin-actions";
import { initialActionState } from "@/lib/actions/types";
import {
  SOFTWARE_CATEGORIES,
  SOFTWARE_PLATFORMS,
  SOFTWARE_REQUEST_STATUS_LABELS,
  type AlliesPageSettings,
  type AssistiveTechSettings,
} from "@/lib/outreach-options";

/**
 * Admin forms for the two public outreach pages: an ally's listing, a tool
 * in the software directory, each page's settings, and a software request.
 */

function SubmitRow({ isPending, label, saved }: { isPending: boolean; label: string; saved: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Save size={16} aria-hidden="true" />}
        {isPending ? "Saving…" : label}
      </Button>
      {saved}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Allies
// ---------------------------------------------------------------------------

export interface AllyFormValues {
  id?: string;
  type: "INDIVIDUAL" | "CORPORATE";
  name: string;
  imageUrl: string | null;
  role: string | null;
  organization: string | null;
  sector: string | null;
  statement: string | null;
  spotlightQuote: string | null;
  featured: boolean;
  websiteUrl: string | null;
  order: number;
  isActive: boolean;
  signupId?: string | null;
}

export function AllyForm({ ally }: { ally: AllyFormValues }) {
  const [state, formAction, isPending] = useActionState(saveAllyAction.bind(null, ally.id ?? null), initialActionState);
  const [type, setType] = useState(ally.type);
  const [featured, setFeatured] = useState(ally.featured);
  const fe = state.fieldErrors ?? {};
  const corporate = type === "CORPORATE";

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      {ally.signupId && <input type="hidden" name="signupId" value={ally.signupId} />}

      <fieldset>
        <legend className="text-sm font-medium text-primary-950 mb-1.5">Kind of ally</legend>
        <div className="flex flex-wrap gap-2">
          {(["INDIVIDUAL", "CORPORATE"] as const).map((value) => (
            <label
              key={value}
              className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 cursor-pointer has-[:checked]:border-primary-800 has-[:checked]:bg-primary-50"
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="h-4 w-4 text-primary-800"
              />
              <span className="text-sm font-semibold text-primary-950">
                {value === "INDIVIDUAL" ? "Individual" : "Corporate / institution"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="ally-name" required>
          {corporate ? "Organisation name" : "Full name"}
        </Label>
        <input id="ally-name" name="name" required maxLength={200} defaultValue={ally.name} className={inputClasses} />
        <FieldError messages={fe.name} />
      </div>

      <ImageUploadField
        key={type}
        name="imageUrl"
        category={corporate ? "LOGO" : "PROFILE"}
        label={corporate ? "Logo (a high-resolution PNG with a transparent background works best)" : "Photo (a professional headshot)"}
        defaultUrl={ally.imageUrl}
        aspect={corporate ? "aspect-[3/2]" : "aspect-square"}
      />

      {corporate ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ally-sector">Industry / sector</Label>
            <input
              id="ally-sector"
              name="sector"
              maxLength={200}
              defaultValue={ally.sector ?? ""}
              className={inputClasses}
              placeholder="e.g. Assistive Technology"
            />
            <FieldError messages={fe.sector} />
          </div>
          <div>
            <Label htmlFor="ally-website">Website</Label>
            <input
              id="ally-website"
              name="websiteUrl"
              type="url"
              maxLength={500}
              defaultValue={ally.websiteUrl ?? ""}
              className={inputClasses}
              placeholder="https://…"
            />
            <FieldError messages={fe.websiteUrl} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ally-role">Role</Label>
            <input
              id="ally-role"
              name="role"
              maxLength={200}
              defaultValue={ally.role ?? ""}
              className={inputClasses}
              placeholder="e.g. Senior Policy Advisor"
            />
            <FieldError messages={fe.role} />
          </div>
          <div>
            <Label htmlFor="ally-organization">Organisation</Label>
            <input
              id="ally-organization"
              name="organization"
              maxLength={200}
              defaultValue={ally.organization ?? ""}
              className={inputClasses}
              placeholder="e.g. Accessibility Division"
            />
            <FieldError messages={fe.organization} />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="ally-statement">{corporate ? "Partnership note" : "Ally statement"}</Label>
        <p className="text-xs text-slate mb-1.5">
          {corporate
            ? "One line on how they support, e.g. “Sponsoring digital inclusion initiatives since 2024.”"
            : "One or two sentences, in their words, on why they support the association."}
        </p>
        <textarea
          id="ally-statement"
          name="statement"
          rows={3}
          maxLength={400}
          defaultValue={ally.statement ?? ""}
          className={inputClasses}
        />
        <FieldError messages={fe.statement} />
      </div>

      <div className="rounded-lg border border-line p-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="featured"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-line text-primary-800"
          />
          <span>
            <span className="block text-sm font-semibold text-primary-950">Feature in the spotlight</span>
            <span className="block text-xs text-slate">Up to three featured quotes appear on the page.</span>
          </span>
        </label>
        {featured && (
          <div>
            <Label htmlFor="ally-quote" required>
              Spotlight quote
            </Label>
            <textarea
              id="ally-quote"
              name="spotlightQuote"
              rows={4}
              maxLength={800}
              defaultValue={ally.spotlightQuote ?? ""}
              className={inputClasses}
            />
            <FieldError messages={fe.spotlightQuote} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div>
          <Label htmlFor="ally-order">Display order</Label>
          <input
            id="ally-order"
            name="order"
            type="number"
            min={0}
            defaultValue={ally.order}
            className={`${inputClasses} max-w-[7rem]`}
          />
        </div>
        <label className="flex items-center gap-2.5 pb-2.5 cursor-pointer">
          <input type="checkbox" name="isActive" defaultChecked={ally.isActive} className="h-4 w-4 rounded border-line text-primary-800" />
          <span className="text-sm font-semibold text-primary-950">Show on the public page</span>
        </label>
      </div>

      <SubmitRow
        isPending={isPending}
        label={ally.id ? "Save changes" : "Add ally"}
        saved={<SavedNotice state={state} isPending={isPending}>Saved. The Allies page is up to date.</SavedNotice>}
      />
    </form>
  );
}

export function AlliesSettingsForm({ settings }: { settings: AlliesPageSettings }) {
  const [state, formAction, isPending] = useActionState(saveAlliesSettingsAction, initialActionState);
  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="partnership-email">Partnership enquiries email</Label>
        <p className="text-xs text-slate mb-1.5">
          Shown at the bottom of the page for corporate partners. Leave blank to use the site&apos;s general email.
        </p>
        <input
          id="partnership-email"
          name="partnershipEmail"
          type="email"
          maxLength={254}
          defaultValue={settings.partnershipEmail}
          className={inputClasses}
        />
        <FieldError messages={state.fieldErrors?.partnershipEmail} />
      </div>
      <SubmitRow isPending={isPending} label="Save" saved={<SavedNotice state={state} isPending={isPending} />} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Assistive software
// ---------------------------------------------------------------------------

export interface SoftwareFormValues {
  id?: string;
  name: string;
  logoUrl: string | null;
  category: string;
  platforms: string[];
  description: string;
  isFree: boolean;
  telegramUrl: string | null;
  websiteUrl: string | null;
  order: number;
  isActive: boolean;
}

export function SoftwareForm({ software }: { software: SoftwareFormValues }) {
  const [state, formAction, isPending] = useActionState(
    saveSoftwareAction.bind(null, software.id ?? null),
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="software-name" required>
            Name
          </Label>
          <input id="software-name" name="name" required maxLength={150} defaultValue={software.name} className={inputClasses} />
          <FieldError messages={fe.name} />
        </div>
        <div>
          <Label htmlFor="software-category" required>
            Category
          </Label>
          <select id="software-category" name="category" defaultValue={software.category} className={inputClasses}>
            {SOFTWARE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <FieldError messages={fe.category} />
        </div>
      </div>

      <ImageUploadField name="logoUrl" category="LOGO" label="Logo" defaultUrl={software.logoUrl} aspect="aspect-square" />

      <div>
        <Label htmlFor="software-description" required>
          Short description
        </Label>
        <textarea
          id="software-description"
          name="description"
          rows={3}
          required
          maxLength={600}
          defaultValue={software.description}
          className={inputClasses}
        />
        <FieldError messages={fe.description} />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-primary-950 mb-1.5">Works on</legend>
        <div className="flex flex-wrap gap-2">
          {SOFTWARE_PLATFORMS.map((p) => (
            <label
              key={p.value}
              className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 cursor-pointer has-[:checked]:border-primary-800 has-[:checked]:bg-primary-50"
            >
              <input
                type="checkbox"
                name="platforms"
                value={p.value}
                defaultChecked={software.platforms.includes(p.value)}
                className="h-4 w-4 rounded border-line text-primary-800"
              />
              <span className="text-sm font-semibold text-primary-950">{p.label}</span>
            </label>
          ))}
        </div>
        <FieldError messages={fe.platforms} />
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-primary-950 mb-1.5">Licence</legend>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "FREE", label: "Free / Open Source" },
            { value: "FUNDED", label: "Paid — funded via donations" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 cursor-pointer has-[:checked]:border-primary-800 has-[:checked]:bg-primary-50"
            >
              <input
                type="radio"
                name="licence"
                value={option.value}
                defaultChecked={(option.value === "FREE") === software.isFree}
                className="h-4 w-4 text-primary-800"
              />
              <span className="text-sm font-semibold text-primary-950">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="software-telegram">Telegram post link</Label>
          <input
            id="software-telegram"
            name="telegramUrl"
            type="url"
            maxLength={500}
            defaultValue={software.telegramUrl ?? ""}
            className={inputClasses}
            placeholder="https://t.me/…"
          />
          <p className="text-xs text-slate mt-1">Leave blank to send people to the library itself.</p>
          <FieldError messages={fe.telegramUrl} />
        </div>
        <div>
          <Label htmlFor="software-website">Official website</Label>
          <input
            id="software-website"
            name="websiteUrl"
            type="url"
            maxLength={500}
            defaultValue={software.websiteUrl ?? ""}
            className={inputClasses}
            placeholder="https://…"
          />
          <FieldError messages={fe.websiteUrl} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div>
          <Label htmlFor="software-order">Display order</Label>
          <input
            id="software-order"
            name="order"
            type="number"
            min={0}
            defaultValue={software.order}
            className={`${inputClasses} max-w-[7rem]`}
          />
        </div>
        <label className="flex items-center gap-2.5 pb-2.5 cursor-pointer">
          <input type="checkbox" name="isActive" defaultChecked={software.isActive} className="h-4 w-4 rounded border-line text-primary-800" />
          <span className="text-sm font-semibold text-primary-950">Show in the directory</span>
        </label>
      </div>

      <SubmitRow
        isPending={isPending}
        label={software.id ? "Save changes" : "Add to directory"}
        saved={<SavedNotice state={state} isPending={isPending}>Saved. The directory is up to date.</SavedNotice>}
      />
    </form>
  );
}

export function AssistiveSettingsForm({ settings }: { settings: AssistiveTechSettings }) {
  const [state, formAction, isPending] = useActionState(saveAssistiveSettingsAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="telegram-url">Telegram software library link</Label>
        <input
          id="telegram-url"
          name="telegramUrl"
          type="url"
          maxLength={500}
          defaultValue={settings.telegramUrl}
          className={inputClasses}
          placeholder="https://t.me/your-channel"
        />
        <p className="text-xs text-slate mt-1">Until this is set, the page&apos;s Telegram buttons say the link is coming soon.</p>
        <FieldError messages={fe.telegramUrl} />
      </div>
      <div>
        <Label htmlFor="support-email">Technical team email</Label>
        <input
          id="support-email"
          name="supportEmail"
          type="email"
          maxLength={254}
          defaultValue={settings.supportEmail}
          className={inputClasses}
        />
        <FieldError messages={fe.supportEmail} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="licence-tier">&ldquo;Sponsor a licence&rdquo; amount (GH₵)</Label>
          <input
            id="licence-tier"
            name="licenceTierCedis"
            type="number"
            min={1}
            defaultValue={settings.licenceTierCedis}
            className={inputClasses}
          />
          <FieldError messages={fe.licenceTierCedis} />
        </div>
        <div>
          <Label htmlFor="hardware-tier">&ldquo;Hardware &amp; tools&rdquo; amount (GH₵)</Label>
          <input
            id="hardware-tier"
            name="hardwareTierCedis"
            type="number"
            min={1}
            defaultValue={settings.hardwareTierCedis}
            className={inputClasses}
          />
          <FieldError messages={fe.hardwareTierCedis} />
        </div>
      </div>
      <SubmitRow isPending={isPending} label="Save settings" saved={<SavedNotice state={state} isPending={isPending} />} />
    </form>
  );
}

export function SoftwareRequestUpdateForm({
  requestId,
  status,
  adminNote,
}: {
  requestId: string;
  status: string;
  adminNote: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    updateSoftwareRequestAction.bind(null, requestId),
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="request-status" required>
          Status
        </Label>
        <select id="request-status" name="status" defaultValue={status} className={inputClasses}>
          {Object.entries(SOFTWARE_REQUEST_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <FieldError messages={fe.status} />
      </div>
      <div>
        <Label htmlFor="request-note">Note</Label>
        <textarea
          id="request-note"
          name="adminNote"
          rows={3}
          maxLength={2000}
          defaultValue={adminNote ?? ""}
          className={inputClasses}
          placeholder="e.g. Added to the Telegram library — look for the post dated 12 October."
        />
        <FieldError messages={fe.adminNote} />
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" name="notify" defaultChecked className="mt-1 h-4 w-4 rounded border-line text-primary-800" />
        <span className="text-sm text-primary-950">Email the requester this status and note</span>
      </label>
      <SubmitRow isPending={isPending} label="Save" saved={<SavedNotice state={state} isPending={isPending} />} />
    </form>
  );
}
