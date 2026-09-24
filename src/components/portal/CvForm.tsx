"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormAlert, Label, SavedNotice, inputClasses } from "@/components/ui/Common";
import { saveCvAction } from "@/lib/actions/cv-actions";
import { initialActionState } from "@/lib/actions/types";
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

type Row = Record<string, string>;

function useRows(initial: Row[]) {
  const [rows, setRows] = useState<Row[]>(initial);
  return {
    rows,
    add: (blank: Row) => setRows((current) => [...current, { ...blank }]),
    remove: (index: number) => setRows((current) => current.filter((_, i) => i !== index)),
    set: (index: number, field: string, value: string) =>
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

export function CvForm({ cv }: { cv: CvInput }) {
  const [state, formAction, isPending] = useActionState(saveCvAction, initialActionState);

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
        onAdd={() => education.add({ institution: "", qualification: "", period: "", grade: "", details: "" })}
      >
        {education.rows.map((row, i) => (
          <RowShell key={`edu-${i}`} legend={`School ${i + 1}`} onRemove={() => education.remove(i)}>
            <Field
              id={`edu-institution-${i}`}
              label="School or university"
              value={row.institution ?? ""}
              onChange={(v) => education.set(i, "institution", v)}
            />
            <Field
              id={`edu-qualification-${i}`}
              label="Qualification"
              value={row.qualification ?? ""}
              onChange={(v) => education.set(i, "qualification", v)}
              placeholder="WASSCE, Diploma in Education"
            />
            <Field
              id={`edu-period-${i}`}
              label="From – to"
              value={row.period ?? ""}
              onChange={(v) => education.set(i, "period", v)}
              placeholder="2018 – 2021"
            />
            <Field
              id={`edu-grade-${i}`}
              label="Result"
              value={row.grade ?? ""}
              onChange={(v) => education.set(i, "grade", v)}
              placeholder="Aggregate 12"
            />
            <Field
              id={`edu-details-${i}`}
              label="Anything worth adding"
              value={row.details ?? ""}
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
        onAdd={() => experience.add({ role: "", organisation: "", period: "", details: "" })}
      >
        {experience.rows.map((row, i) => (
          <RowShell key={`exp-${i}`} legend={`Role ${i + 1}`} onRemove={() => experience.remove(i)}>
            <Field
              id={`exp-role-${i}`}
              label="Role"
              value={row.role ?? ""}
              onChange={(v) => experience.set(i, "role", v)}
              placeholder="Teaching assistant"
            />
            <Field
              id={`exp-organisation-${i}`}
              label="Where"
              value={row.organisation ?? ""}
              onChange={(v) => experience.set(i, "organisation", v)}
            />
            <Field
              id={`exp-period-${i}`}
              label="From – to"
              value={row.period ?? ""}
              onChange={(v) => experience.set(i, "period", v)}
              placeholder="Jan 2025 – present"
            />
            <Field
              id={`exp-details-${i}`}
              label="What you did"
              value={row.details ?? ""}
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
            <Field id={`skill-label-${i}`} label="Skill" value={row.label ?? ""} onChange={(v) => skills.set(i, "label", v)} />
            <Field
              id={`skill-note-${i}`}
              label="How well"
              value={row.note ?? ""}
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
              value={row.label ?? ""}
              onChange={(v) => languages.set(i, "label", v)}
            />
            <Field
              id={`lang-note-${i}`}
              label="How well"
              value={row.note ?? ""}
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
              value={row.label ?? ""}
              onChange={(v) => activities.set(i, "label", v)}
            />
            <Field
              id={`act-note-${i}`}
              label="Your part in it"
              value={row.note ?? ""}
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
            <Field id={`ref-name-${i}`} label="Name" value={row.name ?? ""} onChange={(v) => referees.set(i, "name", v)} />
            <Field
              id={`ref-position-${i}`}
              label="Their position"
              value={row.position ?? ""}
              onChange={(v) => referees.set(i, "position", v)}
            />
            <Field
              id={`ref-organisation-${i}`}
              label="Where they work"
              value={row.organisation ?? ""}
              onChange={(v) => referees.set(i, "organisation", v)}
            />
            <Field
              id={`ref-email-${i}`}
              label="Their email"
              value={row.email ?? ""}
              onChange={(v) => referees.set(i, "email", v)}
            />
            <Field
              id={`ref-phone-${i}`}
              label="Their phone"
              value={row.phone ?? ""}
              onChange={(v) => referees.set(i, "phone", v)}
            />
          </RowShell>
        ))}
      </SectionCard>

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
