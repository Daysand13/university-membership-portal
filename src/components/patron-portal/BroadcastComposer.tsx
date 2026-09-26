"use client";

import { useActionState, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { submitBroadcastAction } from "@/lib/actions/patron-portal-actions";
import type { ActionState } from "@/lib/actions/types";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PatronFileField } from "./PatronFileField";
import { PATRON_BROADCAST_AUDIENCES } from "@/lib/patron-portal-options";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain text from a textarea as simple paragraphs. */
export function textToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function AudienceChoice({ defaultValue, compact }: { defaultValue: string; compact?: boolean }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-primary-950 mb-2">Send to</legend>
      <div className={`grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
        {PATRON_BROADCAST_AUDIENCES.map((audience) => (
          <label
            key={audience.value}
            htmlFor={`patron-audience-${audience.value}`}
            className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 cursor-pointer hover:border-primary-400 has-[:checked]:border-primary-800 has-[:checked]:bg-primary-50"
          >
            <input
              id={`patron-audience-${audience.value}`}
              type="radio"
              name="audience"
              value={audience.value}
              aria-label={audience.label}
              defaultChecked={audience.value === defaultValue}
              className="mt-1 h-4 w-4 text-primary-800"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-primary-950">
                <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: audience.dot }} />
                {audience.label}
              </span>
              {!compact && <span className="block text-xs text-slate mt-0.5">{audience.description}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SentNotice() {
  return (
    <FormAlert
      variant="success"
      message="Sent for approval. The association's team will review your broadcast, and we'll email you when it goes out."
    />
  );
}

/** The full broadcast composer on the Communication Center page. */
export function BroadcastComposer() {
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await submitBroadcastAction(prev, formData);
    if (result.success) setResetKey((k) => k + 1);
    return result;
  }, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" key={resetKey}>
      {state.success ? <SentNotice /> : <FormAlert message={state.error} />}

      <AudienceChoice defaultValue="ALL_MEMBERS" />
      <FieldError messages={fe.audience} />

      <fieldset>
        <legend className="text-sm font-semibold text-primary-950 mb-2">How to send it</legend>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5">
          <label
            htmlFor="patron-post-to-portal"
            className="flex items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 cursor-pointer"
          >
            <input
              id="patron-post-to-portal"
              type="checkbox"
              name="postToPortal"
              aria-label="Portal announcement"
              defaultChecked
              className="h-4 w-4 rounded border-line text-primary-800"
            />
            <span className="text-sm font-medium text-primary-950">Portal announcement</span>
          </label>
          <label
            htmlFor="patron-send-email"
            className="flex items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 cursor-pointer"
          >
            <input
              id="patron-send-email"
              type="checkbox"
              name="sendEmail"
              aria-label="Email"
              defaultChecked
              className="h-4 w-4 rounded border-line text-primary-800"
            />
            <span className="text-sm font-medium text-primary-950">Email</span>
          </label>
        </div>
        <p className="text-xs text-slate mt-2">SMS isn&apos;t available yet.</p>
        <FieldError messages={fe.sendEmail} />
      </fieldset>

      <div>
        <Label htmlFor="broadcast-subject" required>
          Subject
        </Label>
        <input id="broadcast-subject" name="subject" required maxLength={150} className={inputClasses} />
        <FieldError messages={fe.subject} />
      </div>

      <div>
        <p className="block text-sm font-medium text-primary-950 mb-1.5">
          Message<span className="text-danger ml-0.5">*</span>
        </p>
        <RichTextEditor name="bodyHtml" allowImages={false} label="Message" />
        <FieldError messages={fe.bodyHtml} />
      </div>

      <PatronFileField
        name="attachment"
        label="Attachment (optional)"
        hint="An official letter or statement. Members get a link to it."
        errors={fe.attachment}
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Send size={16} aria-hidden="true" />}
          {isPending ? "Sending…" : "Send for Approval"}
        </Button>
        <p className="text-xs text-slate">Nothing is sent to members until the association&apos;s team approves it.</p>
      </div>
    </form>
  );
}

/** The short version on the Overview page: plain text, no attachment. */
export function QuickBroadcastPanel() {
  const [text, setText] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await submitBroadcastAction(prev, formData);
    if (result.success) {
      setText("");
      setResetKey((k) => k + 1);
    }
    return result;
  }, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" key={resetKey}>
      {state.success ? <SentNotice /> : <FormAlert message={state.error} />}
      <input type="hidden" name="postToPortal" value="on" />
      <input type="hidden" name="sendEmail" value="on" />
      <input type="hidden" name="bodyHtml" value={textToHtml(text)} />

      <div>
        <Label htmlFor="quick-audience">Send to</Label>
        <select id="quick-audience" name="audience" defaultValue="ALL_MEMBERS" className={inputClasses}>
          {PATRON_BROADCAST_AUDIENCES.map((audience) => (
            <option key={audience.value} value={audience.value}>
              {audience.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="quick-subject">Subject</Label>
        <input id="quick-subject" name="subject" required maxLength={150} className={inputClasses} />
        <FieldError messages={fe.subject} />
      </div>
      <div>
        <Label htmlFor="quick-message">Message</Label>
        <textarea
          id="quick-message"
          rows={4}
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={inputClasses}
          placeholder="Write to members…"
        />
        <FieldError messages={fe.bodyHtml} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Send size={16} aria-hidden="true" />}
          {isPending ? "Sending…" : "Send Message"}
        </Button>
        <p className="text-xs text-slate">Sent as a portal announcement and email once approved.</p>
      </div>
    </form>
  );
}
