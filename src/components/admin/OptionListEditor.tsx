"use client";

import { useActionState, useId, useState } from "react";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { FieldError, FormAlert, inputClasses } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";

type ListAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * One admin-editable list of form options — a box to add an option, a filter
 * for finding one in a long list, and a remove button per option. Used for
 * the departments and programmes (AcademicOptionList) and the categories of
 * special needs. Both actions receive the option as `label`, alongside any
 * `hiddenFields` that say which list it belongs to.
 */
export function OptionListEditor({
  title,
  noun,
  items,
  addAction,
  removeAction,
  hiddenFields = {},
  placeholder,
  addedMessage,
  removeWarning,
}: {
  title: string;
  /** Singular, lower case — "academic department". */
  noun: string;
  items: string[];
  addAction: ListAction;
  removeAction: ListAction;
  hiddenFields?: Record<string, string>;
  placeholder: string;
  addedMessage: string;
  /** Shown in the confirmation before an option is removed. */
  removeWarning: string;
}) {
  const [addState, submitAdd, isAdding] = useActionState(addAction, initialActionState);
  const [removeState, submitRemove, isRemoving] = useActionState(removeAction, initialActionState);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const baseId = useId();

  // Clear the box once an addition has actually been saved (and only then,
  // so a rejected name stays put for correcting). Adjusted during render —
  // React's pattern for responding to a changed value — not in an effect.
  const [lastAddState, setLastAddState] = useState(addState);
  if (addState !== lastAddState) {
    setLastAddState(addState);
    if (addState.success) setDraft("");
  }

  const needle = query.trim().toLowerCase();
  const visible = needle ? items.filter((item) => item.toLowerCase().includes(needle)) : items;
  const hidden = Object.entries(hiddenFields).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ));

  return (
    <section aria-labelledby={`${baseId}-title`} className="bg-white rounded-lg border border-line p-5 flex flex-col min-w-0">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h3 id={`${baseId}-title`} className="font-display font-bold text-base text-primary-950">
          {title}
        </h3>
        <span className="text-xs font-semibold text-slate shrink-0">
          {items.length} {items.length === 1 ? "option" : "options"}
        </span>
      </div>

      <form action={submitAdd} className="mb-4">
        {hidden}
        <label htmlFor={`${baseId}-new`} className="block text-sm font-medium text-primary-950 mb-1.5">
          Add {noun}
        </label>
        <div className="flex gap-2">
          <input
            id={`${baseId}-new`}
            name="label"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={300}
            required
            placeholder={placeholder}
            className={inputClasses}
          />
          <Button type="submit" disabled={isAdding || !draft.trim()} className="shrink-0">
            {isAdding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add
          </Button>
        </div>
        <FieldError messages={addState.fieldErrors?.label} />
        <FormAlert message={addState.error} />
        {addState.success && !isAdding && (
          <p role="status" className="mt-1.5 text-sm text-success">
            {addedMessage}
          </p>
        )}
      </form>

      {items.length > 8 && (
        <div className="relative mb-3">
          <Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <label htmlFor={`${baseId}-filter`} className="sr-only">
            Find in {title}
          </label>
          <input
            id={`${baseId}-filter`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Find in ${items.length} ${title.toLowerCase()}…`}
            className={`${inputClasses} pl-9`}
          />
        </div>
      )}

      <FormAlert message={removeState.error} />

      {visible.length === 0 ? (
        <p className="text-sm text-slate py-4 text-center">No {title.toLowerCase()} match &ldquo;{query}&rdquo;.</p>
      ) : (
        <ul className="max-h-[26rem] overflow-y-auto rounded-md border border-line divide-y divide-line">
          {visible.map((item) => (
            <li key={item} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm text-ink min-w-0 break-words">{item}</span>
              <form
                action={submitRemove}
                onSubmit={(e) => {
                  if (!window.confirm(`Remove "${item}" from the ${title.toLowerCase()} list?\n\n${removeWarning}`)) {
                    e.preventDefault();
                  }
                }}
                className="shrink-0"
              >
                {hidden}
                <input type="hidden" name="label" value={item} />
                <button
                  type="submit"
                  disabled={isRemoving}
                  aria-label={`Remove ${item}`}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-danger hover:bg-danger-light disabled:opacity-50"
                >
                  <Trash2 size={13} aria-hidden="true" /> Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
