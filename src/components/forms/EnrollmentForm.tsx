"use client";

import { useActionState, useState } from "react";
import { Loader2, ImagePlus, AlertCircle } from "lucide-react";
import { submitEnrollmentAction } from "@/lib/actions/membership-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import {
  DISABILITY_CATEGORIES,
  SUPPORT_NEEDS,
  CAMPUSES,
  HALLS_OF_AFFILIATION,
  ACADEMIC_DEPARTMENTS,
  PROGRAMS_OF_STUDY,
  LEVELS,
  POSTGRAD_DEGREE_CATEGORIES,
  POSTGRAD_DEPARTMENTS,
  POSTGRAD_PROGRAMS,
  POSTGRAD_LEVELS,
  MEMBERSHIP_TYPE_LABELS,
  MAX_PASSPORT_PICTURE_BYTES,
  MAX_MEDICAL_REPORT_BYTES,
  type ApplicationTrack,
} from "@/lib/validations/membership";

const GHANA_REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
];

function SectionCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line p-6 sm:p-7">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-7 h-7 rounded-full bg-primary-800 text-white text-xs font-bold flex items-center justify-center shrink-0 font-data">
          {step}
        </span>
        <h2 className="font-display font-bold text-lg text-primary-950">{title}</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">{children}</div>
    </div>
  );
}

function fileTooLarge(file: File | undefined, maxBytes: number): boolean {
  return !!file && file.size > maxBytes;
}

export function EnrollmentForm({ track }: { track: ApplicationTrack }) {
  const [state, formAction, isPending] = useActionState(submitEnrollmentAction, initialActionState);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [passportTooLarge, setPassportTooLarge] = useState(false);
  const [medicalTooLarge, setMedicalTooLarge] = useState(false);
  const fe = state.fieldErrors ?? {};

  const isPg = track === "POSTGRADUATE";
  const departmentOptions = isPg ? POSTGRAD_DEPARTMENTS : ACADEMIC_DEPARTMENTS;
  const programmeOptions = isPg ? POSTGRAD_PROGRAMS : PROGRAMS_OF_STUDY;
  const levelOptions = isPg ? POSTGRAD_LEVELS : LEVELS;
  const levelLabel = isPg ? "Year of Study" : "Level / Year of Study";

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      <FormAlert message={state.error} />
      <input type="hidden" name="track" value={track} />

      {/* Notice — must be read before membership type / rest of the form */}
      <div className="rounded-lg border border-accent-300 bg-accent-50 p-6 sm:p-7 flex gap-3">
        <AlertCircle size={20} className="text-accent-600 shrink-0 mt-0.5" />
        <div className="text-sm text-primary-950 leading-relaxed space-y-3">
          <p>
            Welcome to the Association of Students with Special Needs at the University of Education, Winneba
            (UEW). Please note that before filling out this online form, you are required to visit the{" "}
            <strong>Resource Center for Students with Special Needs</strong>, located at the{" "}
            <strong>FES Block, Room 104</strong>, to officially register and be verified as a person with special
            needs.
          </p>
          <p>
            Once your physical registration and status have been confirmed at the Resource Center, you may proceed
            to complete this online form. Our association team will review your submitted details for accuracy.
            Upon final review and approval, an official confirmation message will be sent to your personal email
            address to welcome you to the association.
          </p>
        </div>
      </div>

      <SectionCard step={1} title="Membership Type">
        <div className="sm:col-span-2">
          <Label htmlFor="membershipType" required>Membership Status</Label>
          <select id="membershipType" name="membershipType" required className={inputClasses} defaultValue="">
            <option value="" disabled>Select…</option>
            {Object.entries(MEMBERSHIP_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <FieldError messages={fe.membershipType} />
        </div>
      </SectionCard>

      <SectionCard step={2} title="Personal Identification">
        <div>
          <Label htmlFor="firstName" required>First Name</Label>
          <input id="firstName" name="firstName" required className={inputClasses} />
          <FieldError messages={fe.firstName} />
        </div>
        <div>
          <Label htmlFor="middleName">Middle Name</Label>
          <input id="middleName" name="middleName" className={inputClasses} />
        </div>
        <div>
          <Label htmlFor="lastName" required>Surname</Label>
          <input id="lastName" name="lastName" required className={inputClasses} />
          <FieldError messages={fe.lastName} />
        </div>
        <div>
          <Label htmlFor="dateOfBirth" required>Date of Birth</Label>
          <input id="dateOfBirth" name="dateOfBirth" type="date" required className={inputClasses} />
          <FieldError messages={fe.dateOfBirth} />
        </div>
        <div>
          <Label htmlFor="gender" required>Gender</Label>
          <select id="gender" name="gender" required className={inputClasses} defaultValue="">
            <option value="" disabled>Select…</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </select>
          <FieldError messages={fe.gender} />
        </div>
        <div>
          <Label htmlFor="email" required>Personal Email Address</Label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="e.g., yourname@gmail.com"
            className={inputClasses}
          />
          <FieldError messages={fe.email} />
        </div>
        <div>
          <Label htmlFor="phone" required>Phone Number / WhatsApp</Label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            placeholder="e.g., 0240000000"
            className={inputClasses}
          />
          <FieldError messages={fe.phone} />
        </div>
      </SectionCard>

      <SectionCard step={3} title="UEW Campus & Academic Department">
        <div>
          <Label htmlFor="campus" required>UEW Campus</Label>
          <select id="campus" name="campus" required className={inputClasses} defaultValue="">
            <option value="" disabled>Select…</option>
            {CAMPUSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <FieldError messages={fe.campus} />
        </div>
        <div>
          <Label htmlFor="hallOfAffiliation">Hall of Affiliation</Label>
          <select id="hallOfAffiliation" name="hallOfAffiliation" className={inputClasses} defaultValue="">
            <option value="">Not applicable / off-campus</option>
            {HALLS_OF_AFFILIATION.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <FieldError messages={fe.hallOfAffiliation} />
        </div>
        {isPg && (
          <div className="sm:col-span-2">
            <Label htmlFor="degreeCategory" required>Postgraduate Degree Category</Label>
            <select id="degreeCategory" name="degreeCategory" required className={inputClasses} defaultValue="">
              <option value="" disabled>Select…</option>
              {POSTGRAD_DEGREE_CATEGORIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <FieldError messages={fe.degreeCategory} />
          </div>
        )}
        <div className="sm:col-span-2">
          <Label htmlFor="academicDepartment" required>Academic Department</Label>
          <select id="academicDepartment" name="academicDepartment" required className={inputClasses} defaultValue="">
            <option value="" disabled>Select…</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <FieldError messages={fe.academicDepartment} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="programme" required>Program of Study</Label>
          <select id="programme" name="programme" required className={inputClasses} defaultValue="">
            <option value="" disabled>Select…</option>
            {programmeOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <FieldError messages={fe.programme} />
        </div>
        <div>
          <Label htmlFor="level" required>{levelLabel}</Label>
          <select id="level" name="level" required className={inputClasses} defaultValue="">
            <option value="" disabled>Select…</option>
            {levelOptions.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <FieldError messages={fe.level} />
        </div>
        <div>
          <Label htmlFor="indexNumber" required>Index Number</Label>
          <input id="indexNumber" name="indexNumber" required className={inputClasses} />
          <FieldError messages={fe.indexNumber} />
        </div>
        <div>
          <Label htmlFor="yearOfAdmission" required>Year of Admission</Label>
          <input id="yearOfAdmission" name="yearOfAdmission" type="number" min="2000" max="2100" required className={inputClasses} />
          <FieldError messages={fe.yearOfAdmission} />
        </div>
        <div>
          <Label htmlFor="expectedGraduationYear">Expected Graduation Year</Label>
          <input id="expectedGraduationYear" name="expectedGraduationYear" type="number" min="2000" max="2100" className={inputClasses} />
        </div>
      </SectionCard>

      <SectionCard step={4} title="Category of Special Needs">
        <div className="sm:col-span-2">
          <Label htmlFor="department" required>Category of Special Needs</Label>
          <select id="department" name="department" required className={inputClasses} defaultValue="">
            <option value="" disabled>Select…</option>
            {DISABILITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <FieldError messages={fe.department} />
        </div>
        <div className="sm:col-span-2">
          <p className="block text-sm font-semibold text-ink mb-2">Specific Support Needed on Campus</p>
          <div className="space-y-2.5">
            {SUPPORT_NEEDS.map((need) => (
              <label key={need} className="flex items-start gap-2.5 text-sm text-ink font-medium cursor-pointer">
                <input
                  type="checkbox"
                  name="specificSupportNeeds"
                  value={need}
                  className="mt-0.5 h-5 w-5 rounded border-2 border-slate text-primary-800 focus:ring-primary-600 shrink-0"
                />
                {need}
              </label>
            ))}
          </div>
          <FieldError messages={fe.specificSupportNeeds} />
        </div>
      </SectionCard>

      <SectionCard step={5} title="Document Attachments">
        <div>
          <Label htmlFor="profilePicture" required>Passport Picture</Label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-surface-muted border border-line overflow-hidden flex items-center justify-center text-slate-light shrink-0">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus size={18} />
              )}
            </div>
            <input
              id="profilePicture"
              name="profilePicture"
              type="file"
              required
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setPassportTooLarge(fileTooLarge(file, MAX_PASSPORT_PICTURE_BYTES));
                setPreviewUrl(file ? URL.createObjectURL(file) : null);
              }}
              className="block w-full text-sm text-slate file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-800 file:text-sm file:font-semibold hover:file:bg-primary-100"
            />
          </div>
          <p className="mt-1 text-xs text-slate-light">
            Clear, recent passport-sized photo on a plain white background. JPG or PNG, max 2MB.
          </p>
          {passportTooLarge && (
            <p className="mt-1 text-xs text-danger">This photo is over 2MB — please choose a smaller file.</p>
          )}
          <FieldError messages={fe.profilePicture} />
        </div>
        <div>
          <Label htmlFor="medicalReport" required>Medical Report / Disability Assessment</Label>
          <input
            id="medicalReport"
            name="medicalReport"
            type="file"
            required
            accept="image/png,image/jpeg,application/pdf"
            onChange={(e) => setMedicalTooLarge(fileTooLarge(e.target.files?.[0], MAX_MEDICAL_REPORT_BYTES))}
            className="block w-full text-sm text-slate file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-800 file:text-sm file:font-semibold hover:file:bg-primary-100"
          />
          <p className="mt-1 text-xs text-slate-light">
            Official medical report or verification document confirming your registration at the Resource Center.
            PDF, JPG, or PNG, max 5MB.
          </p>
          {medicalTooLarge && (
            <p className="mt-1 text-xs text-danger">This file is over 5MB — please choose a smaller file.</p>
          )}
          <FieldError messages={fe.medicalReportKey} />
        </div>
      </SectionCard>

      <SectionCard step={6} title="Additional Information">
        <div className="sm:col-span-2">
          <Label htmlFor="residentialAddress" required>Residential Address</Label>
          <input id="residentialAddress" name="residentialAddress" required className={inputClasses} />
          <FieldError messages={fe.residentialAddress} />
        </div>
        <div>
          <Label htmlFor="region" required>Region</Label>
          <select id="region" name="region" required className={inputClasses} defaultValue="">
            <option value="" disabled>Select…</option>
            {GHANA_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <FieldError messages={fe.region} />
        </div>
        <div />
        <div>
          <Label htmlFor="emergencyContactName" required>Emergency Contact Name</Label>
          <input id="emergencyContactName" name="emergencyContactName" required className={inputClasses} />
          <FieldError messages={fe.emergencyContactName} />
        </div>
        <div>
          <Label htmlFor="emergencyContactPhone" required>Emergency Contact Phone</Label>
          <input id="emergencyContactPhone" name="emergencyContactPhone" type="tel" required className={inputClasses} />
          <FieldError messages={fe.emergencyContactPhone} />
        </div>
      </SectionCard>

      <div className="rounded-lg border border-line p-6 sm:p-7">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="agreedToTerms" required className="mt-1 h-4 w-4 rounded border-line text-primary-800 focus:ring-primary-600" />
          <span className="text-sm text-slate leading-relaxed">
            I confirm that I have registered at the Resource Center for Students with Special Needs (FES Block,
            Room 104), that all information provided is accurate, and I consent to the association team reviewing
            my details for official acceptance.
          </span>
        </label>
        <FieldError messages={fe.agreedToTerms} />
      </div>

      <Button
        type="submit"
        disabled={isPending || passportTooLarge || medicalTooLarge}
        size="lg"
        className="w-full"
      >
        {isPending && <Loader2 size={16} className="animate-spin" />}
        {isPending ? "Submitting…" : "Submit Membership Registration"}
      </Button>
    </form>
  );
}
