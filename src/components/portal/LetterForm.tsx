"use client";

import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, SavedNotice, inputClasses } from "@/components/ui/Common";
import { SignaturePad } from "@/components/portal/SignaturePad";
import { saveLetterAction } from "@/lib/actions/letter-actions";
import { initialActionState } from "@/lib/actions/types";
import { CLOSINGS, SALUTATIONS, type LetterInput } from "@/lib/validations/letter";
import { SignatureKind } from "@/generated/prisma/enums";

/**
 * Writing a letter in its parts.
 *
 * Every piece is asked for separately, and labelled for what it is, so
 * somebody working through this with a screen reader always knows which
 * part of a letter they are in. Where the parts end up on the page is not
 * their problem — that is the whole point of the thing.
 */

function Field({
  id,
  name,
  label,
  hint,
  defaultValue,
  errors,
  required = false,
  rows,
  type = "text",
  wide = false,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string;
  errors?: string[];
  required?: boolean;
  rows?: number;
  type?: string;
  wide?: boolean;
}) {
  const describedBy = hint ? `${id}-hint` : undefined;
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {rows ? (
        <textarea
          id={id}
          name={name}
          rows={rows}
          defaultValue={defaultValue}
          aria-describedby={describedBy}
          className={inputClasses}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          defaultValue={defaultValue}
          aria-describedby={describedBy}
          className={inputClasses}
        />
      )}
      {hint && (
        <p id={describedBy} className="text-xs text-slate mt-1">
          {hint}
        </p>
      )}
      <FieldError messages={errors} />
    </div>
  );
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
      <h2 className="font-display font-bold text-lg text-primary-950">{title}</h2>
      <p className="text-sm text-slate mt-0.5 mb-4">{description}</p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function LetterForm({ letter, letterId }: { letter: LetterInput; letterId: string | null }) {
  const [state, formAction, isPending] = useActionState(
    saveLetterAction.bind(null, letterId),
    initialActionState,
  );
  const [signature, setSignature] = useState({
    kind: letter.signatureKind ?? SignatureKind.NONE,
    data: letter.signatureData ?? "",
  });
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <FormAlert message={state.error} />
      <input type="hidden" name="signatureKind" value={signature.kind} />
      <input type="hidden" name="signatureData" value={signature.data} />

      <Card title="This letter" description="Only for your own list — it is never printed on the letter.">
        <Field
          id="letter-title"
          name="title"
          label="What to call it"
          hint="e.g. Attachment request to Akropong School"
          defaultValue={letter.title}
          errors={fe.title}
          required
          wide
        />
      </Card>

      <Card title="From you" description="This goes at the top of the letter, above the date.">
        <Field
          id="letter-sender-name"
          name="senderName"
          label="Your name"
          defaultValue={letter.senderName}
          errors={fe.senderName}
          required
        />
        <Field
          id="letter-sender-phone"
          name="senderPhone"
          label="Your phone"
          defaultValue={letter.senderPhone}
          errors={fe.senderPhone}
        />
        <Field
          id="letter-sender-email"
          name="senderEmail"
          label="Your email"
          defaultValue={letter.senderEmail}
          errors={fe.senderEmail}
        />
        <Field
          id="letter-date"
          name="letterDate"
          label="Date on the letter"
          type="date"
          hint="Leave blank and it uses the day you download it."
          defaultValue={letter.letterDate}
          errors={fe.letterDate}
        />
        <Field
          id="letter-sender-address"
          name="senderAddress"
          label="Your address"
          hint="One line per line. It is laid out for you."
          rows={3}
          defaultValue={letter.senderAddress}
          errors={fe.senderAddress}
          wide
        />
      </Card>

      <Card title="To them" description="Leave any of it blank if you don't know it.">
        <Field
          id="letter-recipient-name"
          name="recipientName"
          label="Their name"
          hint="Leave blank and open with Dear Sir/Madam."
          defaultValue={letter.recipientName}
          errors={fe.recipientName}
        />
        <Field
          id="letter-recipient-title"
          name="recipientTitle"
          label="Their position"
          hint="e.g. The Head Teacher"
          defaultValue={letter.recipientTitle}
          errors={fe.recipientTitle}
        />
        <Field
          id="letter-recipient-organisation"
          name="recipientOrganisation"
          label="Their organisation"
          defaultValue={letter.recipientOrganisation}
          errors={fe.recipientOrganisation}
          wide
        />
        <Field
          id="letter-recipient-address"
          name="recipientAddress"
          label="Their address"
          hint="One line per line."
          rows={3}
          defaultValue={letter.recipientAddress}
          errors={fe.recipientAddress}
          wide
        />
      </Card>

      <Card title="The letter itself" description="The words are yours. Where they sit on the page is not your problem.">
        <div>
          <Label htmlFor="letter-salutation" required>
            How it opens
          </Label>
          <input
            id="letter-salutation"
            name="salutation"
            list="salutation-options"
            defaultValue={letter.salutation}
            className={inputClasses}
          />
          <datalist id="salutation-options">
            {SALUTATIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <p className="text-xs text-slate mt-1">The comma is added for you.</p>
          <FieldError messages={fe.salutation} />
        </div>

        <div>
          <Label htmlFor="letter-closing" required>
            How it signs off
          </Label>
          <input
            id="letter-closing"
            name="closing"
            list="closing-options"
            defaultValue={letter.closing}
            className={inputClasses}
          />
          <datalist id="closing-options">
            {CLOSINGS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <p className="text-xs text-slate mt-1">
            &quot;Yours faithfully&quot; to a stranger, &quot;Yours sincerely&quot; when you named them above.
          </p>
          <FieldError messages={fe.closing} />
        </div>

        <Field
          id="letter-subject"
          name="subject"
          label="What it is about"
          hint="Printed in bold above the letter, so a busy office knows before reading it."
          defaultValue={letter.subject}
          errors={fe.subject}
          wide
        />

        <Field
          id="letter-body"
          name="body"
          label="The letter"
          hint="Leave a blank line between paragraphs. Nothing else is interpreted."
          rows={14}
          defaultValue={letter.body}
          errors={fe.body}
          required
          wide
        />
      </Card>

      <SignaturePad kind={signature.kind} data={signature.data} onChange={setSignature} />
      <FieldError messages={fe.signatureData} />

      <div className="flex flex-wrap items-center gap-4 sticky bottom-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          ) : (
            <Save size={16} aria-hidden="true" />
          )}
          {isPending ? "Saving…" : letterId ? "Save the letter" : "Create the letter"}
        </Button>
        <SavedNotice state={state} isPending={isPending} />
      </div>
    </form>
  );
}
