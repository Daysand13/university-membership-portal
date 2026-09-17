"use client";

import { useActionState, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { startThreadAction } from "@/lib/actions/patron-portal-actions";
import type { ActionState } from "@/lib/actions/types";
import { initialActionState } from "@/lib/actions/types";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";

/** A new private message to the executive team. */
export function ThreadComposer({ contacts }: { contacts: string[] }) {
  const [state, formAction, isPending] = useActionState(startThreadAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="thread-to" required>
            To
          </Label>
          <select id="thread-to" name="addressedTo" defaultValue={contacts[0]} className={inputClasses}>
            {contacts.map((contact) => (
              <option key={contact} value={contact}>
                {contact}
              </option>
            ))}
          </select>
          <FieldError messages={fe.addressedTo} />
        </div>
        <div>
          <Label htmlFor="thread-subject" required>
            Subject
          </Label>
          <input id="thread-subject" name="subject" required maxLength={150} className={inputClasses} />
          <FieldError messages={fe.subject} />
        </div>
      </div>
      <div>
        <Label htmlFor="thread-body" required>
          Message
        </Label>
        <textarea id="thread-body" name="body" rows={5} required maxLength={5000} className={inputClasses} />
        <FieldError messages={fe.body} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Send size={16} aria-hidden="true" />}
        {isPending ? "Sending…" : "Send Message"}
      </Button>
    </form>
  );
}

/**
 * A reply box for a conversation — used by patrons and by administrators,
 * each passing their own (already bound) action.
 */
export function ThreadReplyForm({
  action,
  placeholder = "Write a reply…",
  submitLabel = "Send Reply",
  note,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  placeholder?: string;
  submitLabel?: string;
  note?: string;
}) {
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.success) setResetKey((k) => k + 1);
    return result;
  }, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-3" key={resetKey}>
      <FormAlert message={state.error} />
      <div>
        <label htmlFor="reply-body" className="sr-only">
          Reply
        </label>
        <textarea
          id="reply-body"
          name="body"
          rows={4}
          required
          maxLength={5000}
          placeholder={placeholder}
          className={inputClasses}
        />
        <FieldError messages={fe.body} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Send size={16} aria-hidden="true" />}
          {isPending ? "Sending…" : submitLabel}
        </Button>
        {note && <p className="text-xs text-slate">{note}</p>}
      </div>
    </form>
  );
}
