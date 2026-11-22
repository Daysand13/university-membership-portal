"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { build, describe, EMPTY_PARTS, MONTH_NAMES, partsFrom, DATE_EXAMPLES, type DateMode, type DateParts } from "@/lib/date-parts";

/**
 * Entering a date without a calendar.
 *
 * Replaces every `<input type="date">`, `datetime-local`, `month` and `time`
 * on the site. Those open the browser's own picker, which a screen reader
 * cannot use: on Android TalkBack gets a calendar dialog it can barely move
 * through, and on a computer the pop-up is out of reach entirely. Members
 * with screen readers could not put a date of birth into the enrolment
 * form, which is a door the association had closed on exactly the people
 * it exists for.
 *
 * Instead: a day box, the month by name, a year box — and for a time, the
 * hour, the minutes and am or pm. Every box is a native, labelled control,
 * the whole group is a fieldset its legend names, and a number keypad opens
 * on a phone. Typing "27", choosing March, typing "2001" is the same for
 * everybody, with or without sight, and needs no mouse.
 *
 * What the form sends is unchanged: a hidden field with the value the old
 * picker would have sent ("2001-03-27"), so no server code moved. A date
 * that doesn't add up is said in words under the boxes — "February 2027
 * has 28 days" — and stops the form sending, through the browser's own
 * validation, so the person keeps everything else they typed.
 */

export type DateInputProps = {
  /**
   * The name the value is sent under. Left out where a form keeps its
   * values in its own state and sends them some other way — the CV's.
   */
  name?: string;
  /** What the date is: "Date of birth". The group's legend. */
  label: string;
  mode?: DateMode;
  /** Uncontrolled: where it starts, and what a form reset returns it to. */
  defaultValue?: string | null;
  /** Controlled: the value, and what to call when it changes. */
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  /** Earliest and latest allowed, in the same form as the value. */
  min?: string;
  max?: string;
  /** Extra guidance under the legend. The example format is always given. */
  hint?: string;
  /** Messages from the server, for this field. */
  error?: string[];
  /** A date of birth: lets the phone offer the one it already knows. */
  birthday?: boolean;
  /** A smaller, tighter layout for a filter row. */
  compact?: boolean;
  /** For tests and for linking to it from an error summary. */
  id?: string;
  /** Minutes offered in a time, every this many. A value between them is kept. */
  minuteStep?: number;
  /** Switched off — and then nothing is sent, as with any disabled field. */
  disabled?: boolean;
};

const box =
  "block w-full rounded-md border border-line bg-white px-3 py-2.5 text-base sm:text-sm text-ink focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none aria-[invalid=true]:border-danger";

export function DateInput({
  name,
  label,
  mode = "date",
  defaultValue,
  value,
  onChange,
  required = false,
  min,
  max,
  hint,
  error,
  birthday = false,
  compact = false,
  id,
  minuteStep = 5,
  disabled = false,
}: DateInputProps) {
  const generated = useId();
  const base = id ?? `date-${generated.replace(/:/g, "")}`;
  const controlled = value !== undefined;
  const [parts, setParts] = useState<DateParts>(() => partsFrom(controlled ? value : defaultValue, mode));
  const [touched, setTouched] = useState(false);
  const fieldset = useRef<HTMLFieldSetElement>(null);
  const firstBox = useRef<HTMLInputElement | HTMLSelectElement>(null);

  const built = useMemo(() => build(parts, mode, { min, max }), [parts, mode, min, max]);

  // A controlled value changed from outside — a draft restored, a reset.
  // Adjusted while rendering, React's own pattern for following a prop,
  // rather than in an effect that would draw the old boxes first. Our own
  // edits already match, so only an outside change moves anything.
  const [seenValue, setSeenValue] = useState(value);
  if (controlled && value !== seenValue) {
    setSeenValue(value);
    if ((value ?? "") !== built.value) setParts(partsFrom(value, mode));
  }

  // A form reset (after a successful save, say) puts the boxes back too.
  useEffect(() => {
    const form = fieldset.current?.form;
    if (!form) return;
    const onReset = () => {
      setParts(partsFrom(controlled ? value : defaultValue, mode));
      setTouched(false);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [controlled, value, defaultValue, mode]);

  // The browser's own validation stops the form while the date is wrong or
  // missing, and moves to the first box — so a person keeps what they typed.
  useEffect(() => {
    const target = firstBox.current;
    if (!target) return;
    const missing = required && built.empty;
    target.setCustomValidity(disabled ? "" : (built.problem ?? (missing ? `Enter the ${label.toLowerCase()}.` : "")));
  }, [built.problem, built.empty, required, label, disabled]);

  const update = (change: Partial<DateParts>) => {
    const next = { ...parts, ...change };
    setParts(next);
    const result = build(next, mode, { min, max });
    if (onChange) onChange(result.value);
  };

  const shownProblem = (touched && built.problem) || error?.[0] || null;
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;
  const readBackId = `${base}-value`;
  const describedBy = [hintId, shownProblem ? errorId : null, built.value ? readBackId : null].filter(Boolean).join(" ");
  const invalid = Boolean(shownProblem) || undefined;
  // On each box as well as the group: a screen reader reads a description
  // reliably only on the control that has focus.
  const boxDescription = [hintId, shownProblem ? errorId : null].filter(Boolean).join(" ");

  const wantsDate = mode !== "time";
  const wantsDay = mode === "date" || mode === "datetime";
  const wantsTime = mode === "time" || mode === "datetime";

  const minutes = useMemo(() => {
    const step = Math.max(1, Math.min(30, minuteStep));
    const list = Array.from({ length: Math.ceil(60 / step) }, (_, i) => String(i * step).padStart(2, "0"));
    if (parts.minute && !list.includes(parts.minute)) list.push(parts.minute);
    return list.sort();
  }, [minuteStep, parts.minute]);

  const labelClass = compact
    ? "block text-[11px] font-semibold text-slate mb-0.5"
    : "block text-sm font-medium text-primary-950 mb-1";

  return (
    <fieldset
      ref={fieldset}
      id={base}
      disabled={disabled}
      aria-describedby={describedBy}
      onBlur={(event) => {
        // Only once focus has left the whole group: half-way through typing
        // a year is not a mistake worth interrupting.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTouched(true);
      }}
      className="min-w-0"
    >
      <legend
        className={
          compact
            ? "block text-xs font-semibold uppercase tracking-wide text-slate mb-1"
            : "block text-sm font-medium text-primary-950 mb-1"
        }
      >
        {label}
        {required && (
          <>
            <span className="text-danger ml-0.5" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </legend>
      <p id={hintId} className={compact ? "sr-only" : "text-xs text-slate mb-2"}>
        {hint ? `${hint} ` : ""}
        {`Type it, ${DATE_EXAMPLES[mode]}.`}
      </p>

      <div className="flex flex-wrap items-end gap-2">
        {wantsDay && (
          <div className="w-[4.5rem]">
            <label htmlFor={`${base}-day`} className={labelClass}>
              Day
            </label>
            <input
              ref={firstBox as React.Ref<HTMLInputElement>}
              id={`${base}-day`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              autoComplete={birthday ? "bday-day" : "off"}
              required={required}
              aria-invalid={invalid}
              aria-describedby={boxDescription}
              value={parts.day}
              onChange={(event) => update({ day: event.target.value.replace(/\D/g, "") })}
              className={box}
            />
          </div>
        )}
        {wantsDate && (
          <div className="min-w-[7rem] flex-1 max-w-[12rem]">
            <label htmlFor={`${base}-month`} className={labelClass}>
              Month
            </label>
            <select
              ref={wantsDay ? undefined : (firstBox as React.Ref<HTMLSelectElement>)}
              id={`${base}-month`}
              autoComplete={birthday ? "bday-month" : "off"}
              required={required}
              aria-invalid={invalid}
              aria-describedby={boxDescription}
              value={parts.month}
              onChange={(event) => update({ month: event.target.value })}
              className={box}
            >
              <option value="">Choose…</option>
              {MONTH_NAMES.map((month, i) => (
                <option key={month} value={String(i + 1)}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        )}
        {wantsDate && (
          <div className="w-[5.5rem]">
            <label htmlFor={`${base}-year`} className={labelClass}>
              Year
            </label>
            <input
              id={`${base}-year`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete={birthday ? "bday-year" : "off"}
              required={required}
              aria-invalid={invalid}
              aria-describedby={boxDescription}
              value={parts.year}
              onChange={(event) => update({ year: event.target.value.replace(/\D/g, "") })}
              className={box}
            />
          </div>
        )}

        {wantsTime && (
          <>
            <div className="w-[4.75rem]">
              <label htmlFor={`${base}-hour`} className={labelClass}>
                Hour
              </label>
              <select
                ref={mode === "time" ? (firstBox as React.Ref<HTMLSelectElement>) : undefined}
                id={`${base}-hour`}
                required={required}
                aria-invalid={invalid}
              aria-describedby={boxDescription}
                value={parts.hour}
                onChange={(event) => update({ hour: event.target.value })}
                className={box}
              >
                <option value="">–</option>
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[5rem]">
              <label htmlFor={`${base}-minute`} className={labelClass}>
                Minutes
              </label>
              <select
                id={`${base}-minute`}
                required={required}
                aria-invalid={invalid}
              aria-describedby={boxDescription}
                value={parts.minute}
                onChange={(event) => update({ minute: event.target.value })}
                className={box}
              >
                <option value="">–</option>
                {minutes.map((minute) => (
                  <option key={minute} value={minute}>
                    {minute}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[5.25rem]">
              <label htmlFor={`${base}-meridiem`} className={labelClass}>
                am / pm
              </label>
              <select
                id={`${base}-meridiem`}
                required={required}
                aria-invalid={invalid}
              aria-describedby={boxDescription}
                value={parts.meridiem}
                onChange={(event) => update({ meridiem: event.target.value as DateParts["meridiem"] })}
                className={box}
              >
                <option value="">–</option>
                <option value="am">am</option>
                <option value="pm">pm</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Read back in words once it adds up, so a screen reader user hears
          what was actually understood — "Entered: 27 March 2001". */}
      {built.value && !shownProblem && (
        <p id={readBackId} className={compact ? "sr-only" : "mt-1.5 text-xs text-slate"}>
          Entered: {describe(built.value, mode)}
        </p>
      )}
      {shownProblem && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">
          {shownProblem}
        </p>
      )}

      {/* Inside the fieldset, so a disabled one sends nothing — as the old picker didn't. */}
      {name && <input type="hidden" name={name} value={built.value} />}
    </fieldset>
  );
}

export { EMPTY_PARTS };
