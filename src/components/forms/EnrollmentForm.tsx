"use client";

import { useActionState, useRef, useState } from "react";
import { Loader2, ImagePlus, AlertCircle, Pencil, CheckCircle2, FileText } from "lucide-react";
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

const GENDER_LABELS: Record<string, string> = { MALE: "Male", FEMALE: "Female" };

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

// ---------------------------------------------------------------------------
// Review screen — read-only summary of everything captured in the form,
// built from the live FormData at the moment "Review Application" was
// clicked. The underlying <form> stays mounted (just visually hidden) the
// whole time, so nothing is lost when going back to edit.
// ---------------------------------------------------------------------------

function ReviewField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-light">{label}</dt>
      <dd className="text-sm text-ink mt-0.5">{value || <span className="text-slate-light">—</span>}</dd>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line p-6 sm:p-7">
      <h3 className="font-display font-bold text-base text-primary-950 mb-4">{title}</h3>
      <dl className="grid sm:grid-cols-2 gap-4">{children}</dl>
    </div>
  );
}

function ReviewScreen({
  data,
  isPg,
  passportPreviewUrl,
  onEdit,
  onConfirm,
  isPending,
}: {
  data: FormData;
  isPg: boolean;
  passportPreviewUrl: string | null;
  onEdit: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const get = (name: string) => (data.get(name) as string) || "";
  const supportNeeds = data.getAll("specificSupportNeeds") as string[];
  const medicalFile = data.get("medicalReport");
  const medicalFileName = medicalFile instanceof File && medicalFile.size > 0 ? medicalFile.name : null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary-300 bg-primary-50 p-6 sm:p-7 flex gap-3">
        <CheckCircle2 size={20} className="text-primary-700 shrink-0 mt-0.5" />
        <p className="text-sm text-primary-950 leading-relaxed">
          Please review your details carefully before submitting. If anything needs to be corrected, click
          <strong> Edit Application</strong> to go back — your entries will still be there.
        </p>
      </div>

      <ReviewSection title="Membership Type">
        <ReviewField label="Membership Status" value={MEMBERSHIP_TYPE_LABELS[get("membershipType") as keyof typeof MEMBERSHIP_TYPE_LABELS] ?? get("membershipType")} />
      </ReviewSection>

      <ReviewSection title="Personal Identification">
        <ReviewField label="First Name" value={get("firstName")} />
        <ReviewField label="Middle Name" value={get("middleName")} />
        <ReviewField label="Surname" value={get("lastName")} />
        <ReviewField label="Date of Birth" value={get("dateOfBirth")} />
        <ReviewField label="Gender" value={GENDER_LABELS[get("gender")] ?? get("gender")} />
        <ReviewField label="Personal Email Address" value={get("email")} />
        <ReviewField label="Phone Number / WhatsApp" value={get("phone")} />
      </ReviewSection>

      <ReviewSection title={isPg ? "Campus & Postgraduate Department" : "UEW Campus & Academic Department"}>
        <ReviewField label="UEW Campus" value={get("campus")} />
        <ReviewField label="Hall of Affiliation" value={get("hallOfAffiliation")} />
        {isPg && <ReviewField label="Postgraduate Degree Category" value={get("degreeCategory")} />}
        <ReviewField label="Academic Department" value={get("academicDepartment")} />
        <ReviewField label="Program of Study" value={get("programme")} />
        <ReviewField label={isPg ? "Year of Study" : "Level"} value={get("level")} />
        <ReviewField label="Index Number" value={get("indexNumber")} />
        <ReviewField label="Year of Admission" value={get("yearOfAdmission")} />
        <ReviewField label="Expected Graduation Year" value={get("expectedGraduationYear")} />
      </ReviewSection>

      <ReviewSection title="Category of Special Needs">
        <ReviewField label="Category of Special Needs" value={get("department")} />
        <ReviewField
          label="Specific Support Needed on Campus"
          value={
            supportNeeds.length > 0 ? (
              <ul className="list-disc list-inside space-y-0.5">
                {supportNeeds.map((need) => (
                  <li key={need}>{need}</li>
                ))}
              </ul>
            ) : (
              "None selected"
            )
          }
        />
      </ReviewSection>

      <div className="rounded-lg border border-line p-6 sm:p-7">
        <h3 className="font-display font-bold text-base text-primary-950 mb-4">Document Attachments</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-light mb-2">Passport Picture</dt>
            <div className="w-16 h-16 rounded-full bg-surface-muted border border-line overflow-hidden flex items-center justify-center text-slate-light">
              {passportPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={passportPreviewUrl} alt="Passport preview" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus size={18} />
              )}
            </div>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-light mb-2">Medical Report</dt>
            <dd className="text-sm text-ink flex items-center gap-1.5">
              {medicalFileName ? (
                <>
                  <FileText size={15} className="text-primary-700 shrink-0" /> {medicalFileName}
                </>
              ) : (
                <span className="text-slate-light">—</span>
              )}
            </dd>
          </div>
        </div>
      </div>

      <ReviewSection title="Additional Information">
        <ReviewField label="Residential Address" value={get("residentialAddress")} />
        <ReviewField label="Region" value={get("region")} />
        <ReviewField label="Emergency Contact Name" value={get("emergencyContactName")} />
        <ReviewField label="Emergency Contact Phone" value={get("emergencyContactPhone")} />
      </ReviewSection>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="button" variant="outline" onClick={onEdit} className="sm:w-auto" disabled={isPending}>
          <Pencil size={15} /> Edit Application
        </Button>
        <Button type="button" onClick={onConfirm} disabled={isPending} size="lg" className="flex-1">
          {isPending && <Loader2 size={16} className="animate-spin" />}
          {isPending ? "Submitting…" : "Confirm & Submit Membership Registration"}
        </Button>
      </div>
    </div>
  );
}

export function EnrollmentForm({ track }: { track: ApplicationTrack }) {
  const [state, formAction, isPending] = useActionState(submitEnrollmentAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const [phase, setPhase] = useState<"form" | "review">("form");
  const [reviewData, setReviewData] = useState<FormData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [passportTooLarge, setPassportTooLarge] = useState(false);
  const [medicalTooLarge, setMedicalTooLarge] = useState(false);
  const fe = state.fieldErrors ?? {};

  const isPg = track === "POSTGRADUATE";
  const departmentOptions = isPg ? POSTGRAD_DEPARTMENTS : ACADEMIC_DEPARTMENTS;
  const programmeOptions = isPg ? POSTGRAD_PROGRAMS : PROGRAMS_OF_STUDY;
  const levelOptions = isPg ? POSTGRAD_LEVELS : LEVELS;
  const levelLabel = isPg ? "Year of Study" : "Level / Year of Study";

  function handleReviewClick() {
    const formEl = formRef.current;
    if (!formEl) return;
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }
    setReviewData(new FormData(formEl));
    setPhase("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleConfirmSubmit() {
    // The form was never unmounted (just hidden), so its current values —
    // including any edits made after going back — are what gets submitted.
    formRef.current?.requestSubmit();
  }

  return (
    <div>
      {phase === "review" && reviewData && (
        <ReviewScreen
          data={reviewData}
          isPg={isPg}
          passportPreviewUrl={previewUrl}
          onEdit={() => {
            setPhase("form");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onConfirm={handleConfirmSubmit}
          isPending={isPending}
        />
      )}

      <form
        ref={formRef}
        action={formAction}
        className={phase === "review" ? "hidden" : "space-y-6"}
        encType="multipart/form-data"
      >
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
              <strong>FES Block, Room 104</strong>, to officially register and be verified as a person with
              special needs.
            </p>
            <p>
              Once your physical registration and status have been confirmed at the Resource Center, you may
              proceed to complete this online form. Our association team will review your submitted details for
              accuracy. Upon final review and approval, an official confirmation message will be sent to your
              personal email address to welcome you to the association.
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
              <option value="">Select (optional)</option>
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
            <p className="block text-base font-bold text-ink mb-3">Specific Support Needed on Campus</p>
            <div className="grid gap-2.5">
              {SUPPORT_NEEDS.map((need) => (
                <label
                  key={need}
                  className="flex items-start gap-3 rounded-md border-2 border-line bg-white px-4 py-3 cursor-pointer hover:border-primary-600 has-[:checked]:border-primary-700 has-[:checked]:bg-primary-50"
                >
                  <input
                    type="checkbox"
                    name="specificSupportNeeds"
                    value={need}
                    className="mt-0.5 h-5 w-5 rounded border-2 border-slate text-primary-800 focus:ring-2 focus:ring-primary-600 shrink-0"
                  />
                  <span className="text-base font-semibold text-ink leading-snug">{need}</span>
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
              Official medical report or verification document confirming your registration at the Resource
              Center. PDF, JPG, or PNG, max 5MB.
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
              Room 104), that all information provided is accurate, and I consent to the association team
              reviewing my details for official acceptance.
            </span>
          </label>
          <FieldError messages={fe.agreedToTerms} />
        </div>

        <Button type="button" onClick={handleReviewClick} size="lg" className="w-full">
          Review Application
        </Button>
      </form>
    </div>
  );
}
