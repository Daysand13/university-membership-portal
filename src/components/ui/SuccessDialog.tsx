"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Plus } from "lucide-react";
import { hasJustSaved, type ActionState } from "@/lib/actions/types";
import { buttonClasses } from "@/components/ui/Button";

/**
 * The moment after something has been created or sent.
 *
 * A form that saves in place can say "Saved." beside its button and leave
 * it at that. A form that finishes a job can't: the person is done with
 * this screen and the only question left is whether they have another one
 * to add. So the question is put to them, in a dialog over the form, with
 * both answers as buttons — one that empties the form and leaves them
 * where they are, one that takes them back to the list.
 *
 * Built on the native <dialog>, which traps focus, closes on Escape and is
 * announced as a dialog — and, being modal, makes the choice unmissable
 * rather than a notice that scrolls away.
 *
 * Every way out empties the form, Escape included, so what was just saved
 * can't be left sitting in the fields to be saved a second time.
 */
export function SuccessDialog({
  state,
  isPending,
  title,
  description,
  againLabel,
  againIcon,
  onAgain,
  listHref,
  listLabel,
}: {
  state: ActionState;
  isPending: boolean;
  /** Short and past tense: "Article created", "Broadcast sent". */
  title: string;
  /** Shown when the action didn't say anything more particular itself. */
  description?: string;
  /** "Write another", "Add another tool" — what they'd be starting next. */
  againLabel: string;
  /** Defaults to a plus, which is wrong when the button isn't starting another one. */
  againIcon?: ReactNode;
  onAgain: () => void;
  listHref: string;
  listLabel: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const titleId = useId();
  // Identity, not value: each submission returns a fresh state object, so
  // this opens once per save and not again on unrelated re-renders.
  const shown = useRef<ActionState | null>(null);

  const finished = hasJustSaved(state, isPending);
  useEffect(() => {
    if (!finished || shown.current === state) return;
    shown.current = state;
    dialogRef.current?.showModal();
    // React drops the autofocus attribute, and showModal would otherwise
    // land on whichever button happens to come first in the markup.
    againRef.current?.focus();
  }, [finished, state]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        onAgain();
        // Whatever was just added belongs in the list behind this dialog.
        router.refresh();
      }}
      // m-auto: the CSS reset zeroes every margin, which removes the
      // browser's own centring of a modal dialog.
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-primary-950/60"
    >
      <div className="px-6 pt-7 pb-6 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-light text-success">
          <CheckCircle2 size={26} aria-hidden="true" />
        </span>
        <h2 id={titleId} className="font-display font-bold text-xl text-primary-950">
          {title}
        </h2>
        {(state.message ?? description) && <p className="mt-2 text-sm text-slate">{state.message ?? description}</p>}
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-2.5 border-t border-line bg-surface-muted px-6 py-4">
        <button
          type="button"
          onClick={() => {
            dialogRef.current?.close();
            router.push(listHref);
          }}
          className={buttonClasses("outline", "md", "flex-1 bg-white")}
        >
          <ArrowLeft size={16} aria-hidden="true" /> {listLabel}
        </button>
        <button
          type="button"
          ref={againRef}
          onClick={() => dialogRef.current?.close()}
          className={buttonClasses("primary", "md", "flex-1")}
        >
          {againIcon ?? <Plus size={16} aria-hidden="true" />} {againLabel}
        </button>
      </div>
    </dialog>
  );
}

/**
 * The other half of the pattern: a form that can be emptied on the spot.
 *
 * form.reset() only reaches native inputs, which leaves a rich text body
 * or an uploaded image sitting there from the entry before. Changing the
 * key throws the fields away and builds them again from their defaults,
 * whatever kind of field they are.
 */
export function useResettableForm() {
  const [formKey, setFormKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Closing the dialog leaves the keyboard on the <body>, because the
  // button that had focus has just been thrown away with the old fields.
  // An empty form is only useful to somebody who can start typing in it.
  useEffect(() => {
    if (formKey === 0) return;
    formRef.current?.querySelector<HTMLElement>("input:not([type='hidden']), textarea, select")?.focus();
  }, [formKey]);

  return { formKey, formRef, resetForm: () => setFormKey((n) => n + 1) };
}
