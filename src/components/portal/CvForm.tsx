"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormAlert, Label, SavedNotice, inputClasses } from "@/components/ui/Common";
import { saveCvAction } from "@/lib/actions/cv-actions";
import { initialActionState } from "@/lib/actions/types";
import { SignatureKind } from "@/generated/prisma/enums";
import { SignaturePad } from "@/components/portal/SignaturePad";
import {
  OTHER_QUALIFICATION,
  QUALIFICATION_GROUPS,
  isListedQualification,
} from "@/lib/ghana-qualifications";
import type { CvInput } from "@/lib/validations/cv";

/**
 * Writing a CV, a section at a time.
 *
 * The repeating parts are built here and sent as one JSON field, because a
 * CV has as many jobs and schools as it has, and numbering form inputs to
 * match would put the awkwardness on the server for no gain.
 *
 * Every row is a real fieldset with real labels: somebody filling this in
 * with a screen reader needs to know which "From – to" they are typing in.
 */

type Row = Record<string, string | boolean>;

function useRows(initial: Row[]) {
  const [rows, setRows] = useState<Row[]>(initial);
  return {
    rows,
    add: (blank: Row) => setRows((current) => [...current, { ...blank }]),
    remove: (index: number) => setRows((current) => current.filter((_, i) => i !== index)),
    set: (index: number, field: string, value: string | boolean) =>
      setRows((current) => current.map((row, i) => (i === index ? { ...row, [field]: value } : row))),
  };
}

function SectionCard({
  title,
  description,
  children,
  onAdd,
  addLabel,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <section className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
      <h2 className="font-display font-bold text-lg text-primary-950">{title}</h2>
      <p className="text-sm text-slate mt-0.5 mb-4">{description}</p>
      <div className="space-y-4">{children}</div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-semibold text-primary-800 hover:border-primary-400"
      >
        <Plus size={15} aria-hidden="true" /> {addLabel}
      </button>
    </section>
  );
}

function RowShell({ legend, onRemove, children }: { legend: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-line p-4">
      <legend className="px-1.5 text-xs font-semibold uppercase tracking-wide text-slate">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-danger hover:underline"
      >
        <Trash2 size={13} aria-hidden="true" /> Remove
      </button>
    </fieldset>
  );
}

/**
 * When something started and finished.
 *
 * Picked rather than typed, so "Sept 2021" and "09/2021" cannot end up in
 * the same list — and because the CV is sorted by these, a typed date
 * would put somebody's newest job at the bottom. Anything still going on
 * says so instead of needing an end date invented for it.
 */
function DateRange({
  idPrefix,
  start,
  end,
  current,
  onChange,
  currentLabel,
}: {
  idPrefix: string;
  start: string;
  end: string;
  current: boolean;
  onChange: (field: "startMonth" | "endMonth" | "current", value: string | boolean) => void;
  currentLabel: string;
}) {
  return (
    <>
      <div>
        <Label htmlFor={`${idPrefix}-start`}>From</Label>
        <input
          id={`${idPrefix}-start`}
          type="month"
          value={start}
          onChange={(e) => onChange("startMonth", e.target.value)}
          className={inputClasses}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-end`}>To</Label>
        <input
          id={`${idPrefix}-end`}
          type="month"
          value={current ? "" : end}
          disabled={current}
          onChange={(e) => onChange("endMonth", e.target.value)}
          className={`${inputClasses} disabled:bg-surface-muted disabled:text-slate-light`}
        />
        <label htmlFor={`${idPrefix}-current`} className="flex items-center gap-2 mt-2 text-sm text-ink cursor-pointer">
          <input
            id={`${idPrefix}-current`}
            type="checkbox"
            checked={current}
            aria-label={currentLabel}
            onChange={(e) => onChange("current", e.target.checked)}
            className="h-4 w-4 rounded border-line text-primary-800"
          />
          {currentLabel}
        </label>
      </div>
    </>
  );
}

/**
 * Which qualification, picked from the ones awarded in Ghana.
 *
 * A list rather than a box because an employer scanning a CV looks for the
 * qualification by name, and four spellings of WASSCE read as four
 * different things. "Other" is always there: the list is long, but nobody
 * is going to be told their certificate does not exist.
 *
 * Anything already saved that is not on the list — typed in before this
 * existed — stays in the box as it was, rather than being quietly
 * replaced by the nearest option.
 */
function QualificationField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [typingOwn, setTypingOwn] = useState(value !== "" && !isListedQualification(value));
  const selected = typingOwn ? OTHER_QUALIFICATION : value;

  return (
    <div>
      <Label htmlFor={id}>Qualification</Label>
      <select
        id={id}
        value={selected}
        onChange={(e) => {
          const picked = e.target.value;
          if (picked === OTHER_QUALIFICATION) {
            setTypingOwn(true);
            onChange("");
            return;
          }
          setTypingOwn(false);
          onChange(picked);
        }}
        className={inputClasses}
      >
        <option value="">Choose a qualification</option>
        {QUALIFICATION_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={OTHER_QUALIFICATION}>Other — I&apos;ll type it in</option>
      </select>

      {typingOwn && (
        <div className="mt-2">
          <Label htmlFor={`${id}-other`}>Type the qualification</Label>
          <input
            id={`${id}-other`}
            value={value}
            placeholder="As it is written on the certificate"
            onChange={(e) => onChange(e.target.value)}
            className={inputClasses}
          />
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  wide = false,
  textarea = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  wide?: boolean;
  textarea?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <Label htmlFor={id}>{label}</Label>
      {textarea ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      ) : (
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      )}
    </div>
  );
}

export function CvForm({ cv, portal }: { cv: CvInput; portal: "member" | "alumni" }) {
  const [state, formAction, isPending] = useActionState(saveCvAction.bind(null, portal), initialActionState);

  const [headline, setHeadline] = useState(cv.headline ?? "");
  const [summary, setSummary] = useState(cv.summary ?? "");
  const [contactEmail, setContactEmail] = useState(cv.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(cv.contactPhone ?? "");
  const [location, setLocation] = useState(cv.location ?? "");

  const education = useRows(cv.education as unknown as Row[]);
  const experience = useRows(cv.experience as unknown as Row[]);
  const skills = useRows(cv.skills as unknown as Row[]);
  const languages = useRows(cv.languages as unknown as Row[]);
  const activities = useRows(cv.activities as unknown as Row[]);
  const referees = useRows(cv.referees as unknown as Row[]);
  const [signature, setSignature] = useState({
    kind: cv.signatureKind ?? SignatureKind.NONE,
    data: cv.signatureData ?? "",
  });

  const sections = JSON.stringify({
    headline,
    summary,
    contactEmail,
    contactPhone,
    location,
    education: education.rows,
    experience: experience.rows,
    skills: skills.rows,
    languages: languages.rows,
    activities: activities.rows,
    referees: referees.rows,
    signatureKind: signature.kind,
    signatureData: signature.data,
  });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="sections" value={sections} />
      <FormAlert message={state.error} />

      <section className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
        <h2 className="font-display font-bold text-lg text-primary-950">About you</h2>
        <p className="text-sm text-slate mt-0.5 mb-4">
          Your name, programme and index number come from your membership record — you don&apos;t need to type them.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="cv-headline"
            label="Headline"
            value={headline}
            onChange={setHeadline}
            placeholder="Final-year special education student"
            wide
          />
          <Field
            id="cv-summary"
            label="Profile"
            value={summary}
            onChange={setSummary}
            placeholder="Three or four sentences: what you do, what you are good at, what you are looking for."
            textarea
            wide
          />
          <Field
            id="cv-email"
            label="Email for employers"
            value={contactEmail}
            onChange={setContactEmail}
            placeholder="Leave blank to use the one on your record"
          />
          <Field
            id="cv-phone"
            label="Phone for employers"
            value={contactPhone}
            onChange={setContactPhone}
            placeholder="Leave blank to use the one on your record"
          />
          <Field id="cv-location" label="Where you are" value={location} onChange={setLocation} placeholder="Winneba" />
        </div>
      </section>

      <SectionCard
        title="Education"
        description="Anything before your current programme — senior high school, an earlier certificate."
        addLabel="Add a school"
        onAdd={() =>
          education.add({ institution: "", qualification: "", startMonth: "", endMonth: "", current: "", details: "" })
        }
      >
        {education.rows.map((row, i) => (
          <RowShell key={`edu-${i}`} legend={`School ${i + 1}`} onRemove={() => education.remove(i)}>
            <Field
              id={`edu-institution-${i}`}
              label="School or university"
              value={String(row.institution ?? "")}
              onChange={(v) => education.set(i, "institution", v)}
            />
            <QualificationField
              id={`edu-qualification-${i}`}
              value={String(row.qualification ?? "")}
              onChange={(v) => education.set(i, "qualification", v)}
            />
            <DateRange
              idPrefix={`edu-${i}`}
              start={String(row.startMonth ?? "")}
              end={String(row.endMonth ?? "")}
              current={Boolean(row.current)}
              currentLabel="Still studying here"
              onChange={(field, value) => education.set(i, field, value)}
            />
            <Field
              id={`edu-details-${i}`}
              label="Anything worth adding"
              value={String(row.details ?? "")}
              onChange={(v) => education.set(i, "details", v)}
              wide
            />
          </RowShell>
        ))}
      </SectionCard>

      <SectionCard
        title="Experience"
        description="Jobs, attachments, teaching practice, volunteering. Unpaid work counts."
        addLabel="Add a role"
        onAdd={() => experience.add({ role: "", organisation: "", startMonth: "", endMonth: "", current: "", details: "" })}
      >
        {experience.rows.map((row, i) => (
          <RowShell key={`exp-${i}`} legend={`Role ${i + 1}`} onRemove={() => experience.remove(i)}>
            <Field
              id={`exp-role-${i}`}
              label="Role"
              value={String(row.role ?? "")}
              onChange={(v) => experience.set(i, "role", v)}
              placeholder="Teaching assistant"
            />
            <Field
              id={`exp-organisation-${i}`}
              label="Where"
              value={String(row.organisation ?? "")}
              onChange={(v) => experience.set(i, "organisation", v)}
            />
            <DateRange
              idPrefix={`exp-${i}`}
              start={String(row.startMonth ?? "")}
              end={String(row.endMonth ?? "")}
              current={Boolean(row.current)}
              currentLabel="Still in this role"
              onChange={(field, value) => experience.set(i, field, value)}
            />
            <Field
              id={`exp-details-${i}`}
              label="What you did"
              value={String(row.details ?? "")}
              onChange={(v) => experience.set(i, "details", v)}
              placeholder="What you were responsible for, and anything that changed because of you."
              textarea
              wide
            />
          </RowShell>
        ))}
      </SectionCard>

      <SectionCard
        title="Skills"
        description="What you can do. Braille, sign language, spreadsheets, screen readers."
        addLabel="Add a skill"
        onAdd={() => skills.add({ label: "", note: "" })}
      >
        {skills.rows.map((row, i) => (
          <RowShell key={`skill-${i}`} legend={`Skill ${i + 1}`} onRemove={() => skills.remove(i)}>
            <Field id={`skill-label-${i}`} label="Skill" value={String(row.label ?? "")} onChange={(v) => skills.set(i, "label", v)} />
            <Field
              id={`skill-note-${i}`}
              label="How well"
              value={String(row.note ?? "")}
              onChange={(v) => skills.set(i, "note", v)}
              placeholder="Confident, three years"
            />
          </RowShell>
        ))}
      </SectionCard>

      <SectionCard
        title="Languages"
        description="Including Ghanaian Sign Language."
        addLabel="Add a language"
        onAdd={() => languages.add({ label: "", note: "" })}
      >
        {languages.rows.map((row, i) => (
          <RowShell key={`lang-${i}`} legend={`Language ${i + 1}`} onRemove={() => languages.remove(i)}>
            <Field
              id={`lang-label-${i}`}
              label="Language"
              value={String(row.label ?? "")}
              onChange={(v) => languages.set(i, "label", v)}
            />
            <Field
              id={`lang-note-${i}`}
              label="How well"
              value={String(row.note ?? "")}
              onChange={(v) => languages.set(i, "note", v)}
              placeholder="Fluent"
            />
          </RowShell>
        ))}
      </SectionCard>

      <SectionCard
        title="Activities and leadership"
        description="Committees, clubs, anything you have organised or been elected to."
        addLabel="Add an activity"
        onAdd={() => activities.add({ label: "", note: "" })}
      >
        {activities.rows.map((row, i) => (
          <RowShell key={`act-${i}`} legend={`Activity ${i + 1}`} onRemove={() => activities.remove(i)}>
            <Field
              id={`act-label-${i}`}
              label="What"
              value={String(row.label ?? "")}
              onChange={(v) => activities.set(i, "label", v)}
            />
            <Field
              id={`act-note-${i}`}
              label="Your part in it"
              value={String(row.note ?? "")}
              onChange={(v) => activities.set(i, "note", v)}
              placeholder="Secretary, 2025"
            />
          </RowShell>
        ))}
      </SectionCard>

      <SectionCard
        title="Referees"
        description="Ask them first. Two is normal, three is plenty."
        addLabel="Add a referee"
        onAdd={() => referees.add({ name: "", position: "", organisation: "", email: "", phone: "" })}
      >
        {referees.rows.map((row, i) => (
          <RowShell key={`ref-${i}`} legend={`Referee ${i + 1}`} onRemove={() => referees.remove(i)}>
            <Field id={`ref-name-${i}`} label="Name" value={String(row.name ?? "")} onChange={(v) => referees.set(i, "name", v)} />
            <Field
              id={`ref-position-${i}`}
              label="Their position"
              value={String(row.position ?? "")}
              onChange={(v) => referees.set(i, "position", v)}
            />
            <Field
              id={`ref-organisation-${i}`}
              label="Where they work"
              value={String(row.organisation ?? "")}
              onChange={(v) => referees.set(i, "organisation", v)}
            />
            <Field
              id={`ref-email-${i}`}
              label="Their email"
              value={String(row.email ?? "")}
              onChange={(v) => referees.set(i, "email", v)}
            />
            <Field
              id={`ref-phone-${i}`}
              label="Their phone"
              value={String(row.phone ?? "")}
              onChange={(v) => referees.set(i, "phone", v)}
            />
          </RowShell>
        ))}
      </SectionCard>

      <SignaturePad kind={signature.kind} data={signature.data} onChange={setSignature} />

      <div className="flex flex-wrap items-center gap-4 sticky bottom-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          ) : (
            <Save size={16} aria-hidden="true" />
          )}
          {isPending ? "Saving…" : "Save my CV"}
        </Button>
        <SavedNotice state={state} isPending={isPending} />
      </div>
    </form>
  );
}
