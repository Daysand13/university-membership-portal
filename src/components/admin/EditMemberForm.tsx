"use client";

import { useActionState, useState } from "react";
import { Pencil, X, Loader2, Save } from "lucide-react";
import { updateMemberAdminAction } from "@/lib/actions/membership-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import {
  CAMPUSES,
  HALLS_OF_AFFILIATION,
  GHANA_REGIONS,
  DISABILITY_CATEGORIES,
  SUPPORT_NEEDS,
  ACADEMIC_DEPARTMENTS,
  PROGRAMS_OF_STUDY,
  LEVELS,
  POSTGRAD_DEGREE_CATEGORIES,
  POSTGRAD_DEPARTMENTS,
  POSTGRAD_PROGRAMS,
  POSTGRAD_LEVELS,
  MEMBERSHIP_TYPE_LABELS,
} from "@/lib/validations/membership";
import type { Member } from "@/generated/prisma/client";

function toDateInputValue(date?: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-light uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-ink mt-0.5">{value || "—"}</dd>
    </div>
  );
}

/**
 * A record's academic fields are free text underneath, so an older record
 * can hold a value that predates a since-renamed or since-removed list
 * option (see the abbreviation migration mentioned in project history).
 * Rendering a plain <select> in that case would silently swap the person's
 * real value for whatever the list's first option happens to be the moment
 * an admin opens the editor — so the current value is always kept as a
 * selectable option even when it isn't one of the standard ones.
 */
function customValueOption(value: string, options: readonly string[]) {
  if (!value || options.includes(value)) return null;
  return (
    <option value={value}>
      {value} (current value — not in the standard list)
    </option>
  );
}

/** Plain, uncontrolled select — for fields nothing else on the form reacts to. */
function SelectField({
  id,
  label,
  required,
  defaultValue,
  options,
  error,
  allowBlank,
}: {
  id: string;
  label: string;
  required?: boolean;
  defaultValue: string;
  options: readonly string[];
  error?: string[];
  allowBlank?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id} required={required}>{label}</Label>
      <select id={id} name={id} required={required} className={inputClasses} defaultValue={defaultValue}>
        {allowBlank && <option value="">—</option>}
        {customValueOption(defaultValue, options)}
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <FieldError messages={error} />
    </div>
  );
}

/** Controlled select — for the track-dependent fields whose option list swaps live. */
function ControlledSelectField({
  id,
  label,
  required,
  value,
  onChange,
  options,
  error,
  allowBlank,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  error?: string[];
  allowBlank?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id} required={required}>{label}</Label>
      <select id={id} name={id} required={required} className={inputClasses} value={value} onChange={(e) => onChange(e.target.value)}>
        {allowBlank && <option value="">—</option>}
        {customValueOption(value, options)}
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <FieldError messages={error} />
    </div>
  );
}

/**
 * Renders the Contact / Academic / Category of Special Needs sections of a
 * member's profile — as a read-only summary by default, swapping in an edit
 * form covering the same fields (plus the index number, which has no
 * read-only display elsewhere on this page) when an admin clicks Edit.
 *
 * Deliberately excludes account status and graduation, which already have
 * their own dedicated, separately-audited controls elsewhere on this page,
 * and the two file attachments, which have no admin re-upload path yet.
 */
export function EditMemberForm({ member }: { member: Member }) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateMemberAdminAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  // Closing back to the read-only view on a successful save happens during
  // render (not a useEffect) so it can't flash the form open for an extra
  // frame after the action already succeeded — same pattern as the
  // enrollment form's own state-driven phase switch. The page's Server
  // Component re-fetches on a successful action, so by the time this runs
  // the `member` prop is already the saved data.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) setIsEditing(false);
  }

  // Only this handful of fields determine which picklists are valid, so only
  // they need to be controlled — everything else is a plain uncontrolled
  // field read straight off the FormData on submit. Re-derived from `member`
  // on every mount of the edit form (i.e. every time isEditing flips true),
  // so reopening the editor after a save starts from the fresh values.
  const [track, setTrack] = useState<string>(member.applicationTrack ?? "UNDERGRADUATE");
  const [academicDepartment, setAcademicDepartment] = useState(member.academicDepartment ?? "");
  const [programme, setProgramme] = useState(member.programme);
  const [level, setLevel] = useState(member.level);
  const [degreeCategory, setDegreeCategory] = useState(member.degreeCategory ?? "");

  const isPg = track === "POSTGRADUATE";
  const departmentOptions = isPg ? POSTGRAD_DEPARTMENTS : ACADEMIC_DEPARTMENTS;
  const programmeOptions = isPg ? POSTGRAD_PROGRAMS : PROGRAMS_OF_STUDY;
  const levelOptions = isPg ? POSTGRAD_LEVELS : LEVELS;

  function startEditing() {
    setTrack(member.applicationTrack ?? "UNDERGRADUATE");
    setAcademicDepartment(member.academicDepartment ?? "");
    setProgramme(member.programme);
    setLevel(member.level);
    setDegreeCategory(member.degreeCategory ?? "");
    setIsEditing(true);
  }

  if (!isEditing) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <section className="bg-white rounded-lg border border-line p-6 sm:col-span-2 flex items-center justify-between">
          <p className="text-sm text-slate">Index number, name, contact and academic details.</p>
          <Button type="button" variant="outline" size="sm" onClick={startEditing}>
            <Pencil size={14} /> Edit Details
          </Button>
        </section>
        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="font-display font-bold text-base text-primary-950 mb-4">Contact</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Index Number" value={member.indexNumber} />
            <Field label="Email" value={member.email} />
            <Field label="Phone" value={member.phone} />
            <Field label="Region" value={member.region} />
            <Field label="Residential Address" value={member.residentialAddress} />
            <Field label="Emergency Contact Name" value={member.emergencyContactName} />
            <Field label="Emergency Phone" value={member.emergencyContactPhone} />
          </dl>
        </section>
        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="font-display font-bold text-base text-primary-950 mb-4">Academic</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Membership Type" value={member.membershipType} />
            <Field label="Study Level (Track)" value={member.applicationTrack} />
            <Field label="Postgraduate Degree Category" value={member.degreeCategory} />
            <Field label="Academic Department" value={member.academicDepartment} />
            <Field label="Programme" value={member.programme} />
            <Field label="Level" value={member.level} />
            <Field label="Campus" value={member.campus} />
            <Field label="Hall of Affiliation" value={member.hallOfAffiliation} />
            <Field label="Year of Admission" value={member.yearOfAdmission} />
            <Field label="Expected Graduation Year" value={member.expectedGraduationYear} />
          </dl>
        </section>
        <section className="bg-white rounded-lg border border-line p-6 sm:col-span-2">
          <h2 className="font-display font-bold text-base text-primary-950 mb-4">Category of Special Needs</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Category" value={member.department} />
          </dl>
          {member.specificSupportNeeds.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate mb-2">
                Specific Support Needed
              </p>
              <ul className="list-disc list-inside text-sm text-ink space-y-1">
                {member.specificSupportNeeds.map((need) => (
                  <li key={need}>{need}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="memberId" value={member.id} />
      <input type="hidden" name="applicationTrack" value={track} />

      <FormAlert message={state.error} />

      <div className="bg-white rounded-lg border border-line p-6">
        <h3 className="font-display font-bold text-base text-primary-950 mb-4">Identification</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="indexNumber" required>Index Number</Label>
            <input id="indexNumber" name="indexNumber" required defaultValue={member.indexNumber} className={`${inputClasses} font-data`} />
            <FieldError messages={fe.indexNumber} />
          </div>
          <div>
            <Label htmlFor="firstName" required>First Name</Label>
            <input id="firstName" name="firstName" required defaultValue={member.firstName} className={inputClasses} />
            <FieldError messages={fe.firstName} />
          </div>
          <div>
            <Label htmlFor="middleName">Middle Name</Label>
            <input id="middleName" name="middleName" defaultValue={member.middleName ?? ""} className={inputClasses} />
          </div>
          <div>
            <Label htmlFor="lastName" required>Surname</Label>
            <input id="lastName" name="lastName" required defaultValue={member.lastName} className={inputClasses} />
            <FieldError messages={fe.lastName} />
          </div>
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={toDateInputValue(member.dateOfBirth)} className={inputClasses} />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <select id="gender" name="gender" defaultValue={member.gender ?? ""} className={inputClasses}>
              <option value="">—</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line p-6">
        <h3 className="font-display font-bold text-base text-primary-950 mb-4">Contact</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="email" required>Email</Label>
            <input id="email" name="email" type="email" required defaultValue={member.email} className={inputClasses} />
            <FieldError messages={fe.email} />
          </div>
          <div>
            <Label htmlFor="phone" required>Phone Number</Label>
            <input id="phone" name="phone" required defaultValue={member.phone} className={inputClasses} />
            <FieldError messages={fe.phone} />
          </div>
          <SelectField id="region" label="Region" defaultValue={member.region ?? ""} options={GHANA_REGIONS} allowBlank />
          <div>
            <Label htmlFor="residentialAddress">Residential Address</Label>
            <input id="residentialAddress" name="residentialAddress" defaultValue={member.residentialAddress ?? ""} className={inputClasses} />
          </div>
          <div>
            <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
            <input id="emergencyContactName" name="emergencyContactName" defaultValue={member.emergencyContactName ?? ""} className={inputClasses} />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
            <input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={member.emergencyContactPhone ?? ""} className={inputClasses} />
            <FieldError messages={fe.emergencyContactPhone} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line p-6">
        <h3 className="font-display font-bold text-base text-primary-950 mb-4">Academic</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="membershipType">Membership Type</Label>
            <select id="membershipType" name="membershipType" defaultValue={member.membershipType ?? ""} className={inputClasses}>
              <option value="">—</option>
              {Object.entries(MEMBERSHIP_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="track-select" required>Study Level (Track)</Label>
            <select
              id="track-select"
              required
              className={inputClasses}
              value={track}
              onChange={(e) => {
                // Switching track invalidates whatever was chosen for the
                // three lists below — clearing them here rather than
                // silently carrying over a value that used to be valid for
                // the other track avoids saving a mismatched combination.
                setTrack(e.target.value);
                setAcademicDepartment("");
                setProgramme("");
                setLevel("");
                setDegreeCategory("");
              }}
            >
              <option value="UNDERGRADUATE">Undergraduate</option>
              <option value="POSTGRADUATE">Postgraduate</option>
            </select>
          </div>
          <SelectField id="campus" label="UEW Campus" required defaultValue={member.campus} options={CAMPUSES} />
          <SelectField
            id="hallOfAffiliation"
            label="Hall of Affiliation"
            defaultValue={member.hallOfAffiliation ?? ""}
            options={HALLS_OF_AFFILIATION}
            allowBlank
          />
          {isPg && (
            <ControlledSelectField
              id="degreeCategory"
              label="Postgraduate Degree Category"
              value={degreeCategory}
              onChange={setDegreeCategory}
              options={POSTGRAD_DEGREE_CATEGORIES}
              allowBlank
            />
          )}
          <ControlledSelectField
            id="academicDepartment"
            label="Academic Department"
            value={academicDepartment}
            onChange={setAcademicDepartment}
            options={departmentOptions}
            error={fe.academicDepartment}
            allowBlank
          />
          <ControlledSelectField
            id="programme"
            label="Programme of Study"
            required
            value={programme}
            onChange={setProgramme}
            options={programmeOptions}
            error={fe.programme}
          />
          <ControlledSelectField
            id="level"
            label={isPg ? "Year of Study" : "Level"}
            required
            value={level}
            onChange={setLevel}
            options={levelOptions}
            error={fe.level}
          />
          <div>
            <Label htmlFor="yearOfAdmission" required>Year of Admission</Label>
            <input id="yearOfAdmission" name="yearOfAdmission" type="number" required defaultValue={member.yearOfAdmission} className={inputClasses} />
            <FieldError messages={fe.yearOfAdmission} />
          </div>
          <div>
            <Label htmlFor="expectedGraduationYear">Expected Graduation Year</Label>
            <input
              id="expectedGraduationYear"
              name="expectedGraduationYear"
              type="number"
              defaultValue={member.expectedGraduationYear ?? ""}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line p-6">
        <h3 className="font-display font-bold text-base text-primary-950 mb-4">Category of Special Needs</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <SelectField
            id="department"
            label="Category"
            required
            defaultValue={member.department}
            options={DISABILITY_CATEGORIES}
            error={fe.department}
          />
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate mb-2">Specific Support Needed</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {SUPPORT_NEEDS.map((need) => (
              <label key={need} className="flex items-start gap-2 text-sm text-ink cursor-pointer">
                <input
                  type="checkbox"
                  name="specificSupportNeeds"
                  value={need}
                  defaultChecked={member.specificSupportNeeds.includes(need)}
                  className="mt-0.5 h-4 w-4 rounded border-line text-primary-800 focus:ring-primary-600"
                />
                {need}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => setIsEditing(false)}>
          <X size={14} /> Cancel
        </Button>
      </div>
    </form>
  );
}
