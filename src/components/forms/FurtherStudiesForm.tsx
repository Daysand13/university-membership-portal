"use client";

import { useActionState, useRef, useState } from "react";
import { Loader2, ImagePlus, FileText, CheckCircle2 } from "lucide-react";
import { submitFurtherStudiesAction, requestFurtherStudiesUploadAction } from "@/lib/actions/alumni-actions";
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
  GHANA_REGIONS,
} from "@/lib/validations/membership";
import { prepareAndUpload, type UploadOutcome } from "@/lib/client/upload-attachment";
import type { AlumniProfile } from "@/generated/prisma/client";

const PASSPORT_TARGET_BYTES = 1024 * 1024; // 1 MB
const MEDICAL_IMAGE_TARGET_BYTES = 2.5 * 1024 * 1024; // 2.5 MB

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function nameParts(fullName: string): { firstName: string; middleName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] ?? "", middleName: "", lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1],
    middleName: parts.slice(1, -1).join(" "),
  };
}

// Every simple field is controlled, deliberately — React resets any
// *uncontrolled* field once useActionState's action finishes, including on
// a validation failure, not just on success. A single-page form with no
// review step has no second chance to catch that: an unrelated duplicate
// index number or an unchecked consent box would otherwise silently wipe
// the whole form the applicant just filled in. Same reasoning, same fix, as
// the public enrollment form (see EnrollmentForm.tsx).
interface FormValues {
  membershipType: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  campus: string;
  hallOfAffiliation: string;
  indexNumber: string;
  yearOfAdmission: string;
  expectedGraduationYear: string;
  department: string;
  specificSupportNeeds: string[];
  residentialAddress: string;
  region: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  agreedToTerms: boolean;
}

export function FurtherStudiesForm({ alumni }: { alumni: AlumniProfile }) {
  const [state, formAction, isPending] = useActionState(submitFurtherStudiesAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  // Someone who was already linked to a real Member account before — either
  // by graduating from one, or by a previous approved further-studies
  // application — was physically verified at the Resource Center at least
  // once already. A purely self-registered alumnus never was.
  const attachmentsRequired = !alumni.sourceMemberId;

  const initialName = nameParts(alumni.fullName);
  const [values, setValues] = useState<FormValues>({
    membershipType: "",
    firstName: initialName.firstName,
    middleName: initialName.middleName,
    lastName: initialName.lastName,
    dateOfBirth: "",
    gender: "",
    campus: "",
    hallOfAffiliation: "",
    indexNumber: "",
    yearOfAdmission: String(new Date().getFullYear()),
    expectedGraduationYear: "",
    department: "",
    specificSupportNeeds: [],
    residentialAddress: "",
    region: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    agreedToTerms: false,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
      const checked = e.target.checked;
      setValues((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function toggleSupportNeed(need: string, checked: boolean) {
    setValues((prev) => ({
      ...prev,
      specificSupportNeeds: checked ? [...prev.specificSupportNeeds, need] : prev.specificSupportNeeds.filter((n) => n !== need),
    }));
  }

  const [track, setTrack] = useState("UNDERGRADUATE");
  const [academicDepartment, setAcademicDepartment] = useState("");
  const [programme, setProgramme] = useState("");
  const [level, setLevel] = useState("");
  const [degreeCategory, setDegreeCategory] = useState("");
  const isPg = track === "POSTGRADUATE";
  const departmentOptions = isPg ? POSTGRAD_DEPARTMENTS : ACADEMIC_DEPARTMENTS;
  const programmeOptions = isPg ? POSTGRAD_PROGRAMS : PROGRAMS_OF_STUDY;
  const levelOptions = isPg ? POSTGRAD_LEVELS : LEVELS;

  const passportInputRef = useRef<HTMLInputElement>(null);
  const medicalInputRef = useRef<HTMLInputElement>(null);
  const [passportToken, setPassportToken] = useState("");
  const [medicalToken, setMedicalToken] = useState("");
  const [passportBytes, setPassportBytes] = useState(0);
  const [medicalBytes, setMedicalBytes] = useState(0);
  const [medicalFileName, setMedicalFileName] = useState<string | null>(null);
  const [passportError, setPassportError] = useState<string | null>(null);
  const [medicalError, setMedicalError] = useState<string | null>(null);
  const [processingFiles, setProcessingFiles] = useState(false);

  async function handleFileChange(kind: "passport" | "medical", file: File | undefined) {
    const setError = kind === "passport" ? setPassportError : setMedicalError;
    setError(null);
    if (!file) return;

    setProcessingFiles(true);
    try {
      const outcome: UploadOutcome = await prepareAndUpload(
        kind,
        file,
        kind === "passport" ? PASSPORT_TARGET_BYTES : MEDICAL_IMAGE_TARGET_BYTES,
        requestFurtherStudiesUploadAction,
      );
      if (outcome.status === "error") {
        setError(outcome.message);
        if (kind === "passport") {
          setPassportBytes(0);
          setPassportToken("");
        } else {
          setMedicalBytes(0);
          setMedicalToken("");
        }
        return;
      }
      if (kind === "passport") {
        setPassportBytes(outcome.bytes);
        setPassportToken(outcome.status === "ready" ? outcome.token : "");
      } else {
        setMedicalBytes(outcome.bytes);
        setMedicalToken(outcome.status === "ready" ? outcome.token : "");
        setMedicalFileName(outcome.filename);
      }
    } finally {
      setProcessingFiles(false);
    }
  }

  if (state.success) {
    return (
      <div className="flex items-start gap-3 text-sm text-success bg-success-light rounded-md px-4 py-3.5">
        <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
        <p>
          Your application has been submitted for review. You&apos;ll receive an email once a decision has been
          made — your existing Alumni account is unaffected in the meantime.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <FormAlert message={state.error} />
      <input type="hidden" name="track" value={track} />
      <input type="hidden" name="academicDepartment" value={academicDepartment} />
      <input type="hidden" name="programme" value={programme} />
      <input type="hidden" name="level" value={level} />
      <input type="hidden" name="degreeCategory" value={degreeCategory} />
      <input type="hidden" name="profilePictureToken" value={passportToken} />
      <input type="hidden" name="medicalReportToken" value={medicalToken} />

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="membershipType" required>Membership Status</Label>
          <select id="membershipType" name="membershipType" required className={inputClasses} value={values.membershipType} onChange={handleChange}>
            <option value="" disabled>Select…</option>
            {Object.entries(MEMBERSHIP_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <FieldError messages={fe.membershipType} />
        </div>
        <div>
          <Label htmlFor="track-select" required>Study Level</Label>
          <select
            id="track-select"
            required
            className={inputClasses}
            value={track}
            onChange={(e) => {
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
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        <div>
          <Label htmlFor="firstName" required>First Name</Label>
          <input id="firstName" name="firstName" required value={values.firstName} onChange={handleChange} className={inputClasses} />
          <FieldError messages={fe.firstName} />
        </div>
        <div>
          <Label htmlFor="middleName">Middle Name</Label>
          <input id="middleName" name="middleName" value={values.middleName} onChange={handleChange} className={inputClasses} />
        </div>
        <div>
          <Label htmlFor="lastName" required>Surname</Label>
          <input id="lastName" name="lastName" required value={values.lastName} onChange={handleChange} className={inputClasses} />
          <FieldError messages={fe.lastName} />
        </div>
        <p className="sm:col-span-3 text-xs text-slate-light -mt-2">
          Pre-filled from your Alumni account name — correct it above if it&apos;s not split quite right.
        </p>
        <div>
          <Label htmlFor="dateOfBirth" required>Date of Birth</Label>
          <input id="dateOfBirth" name="dateOfBirth" type="date" required value={values.dateOfBirth} onChange={handleChange} className={inputClasses} />
          <FieldError messages={fe.dateOfBirth} />
        </div>
        <div>
          <Label htmlFor="gender" required>Gender</Label>
          <select id="gender" name="gender" required className={inputClasses} value={values.gender} onChange={handleChange}>
            <option value="" disabled>Select…</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          <FieldError messages={fe.gender} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="campus" required>UEW Campus</Label>
          <select id="campus" name="campus" required className={inputClasses} value={values.campus} onChange={handleChange}>
            <option value="" disabled>Select…</option>
            {CAMPUSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <FieldError messages={fe.campus} />
        </div>
        <div>
          <Label htmlFor="hallOfAffiliation">Hall of Affiliation</Label>
          <select id="hallOfAffiliation" name="hallOfAffiliation" className={inputClasses} value={values.hallOfAffiliation} onChange={handleChange}>
            <option value="">—</option>
            {HALLS_OF_AFFILIATION.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        {isPg && (
          <div>
            <Label htmlFor="degreeCategory-select" required>Postgraduate Degree Category</Label>
            <select
              id="degreeCategory-select"
              required
              className={inputClasses}
              value={degreeCategory}
              onChange={(e) => setDegreeCategory(e.target.value)}
            >
              <option value="" disabled>Select…</option>
              {POSTGRAD_DEGREE_CATEGORIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <FieldError messages={fe.degreeCategory} />
          </div>
        )}
        <div>
          <Label htmlFor="academicDepartment-select" required>Academic Department</Label>
          <select
            id="academicDepartment-select"
            required
            className={inputClasses}
            value={academicDepartment}
            onChange={(e) => setAcademicDepartment(e.target.value)}
          >
            <option value="" disabled>Select…</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <FieldError messages={fe.academicDepartment} />
        </div>
        <div>
          <Label htmlFor="programme-select" required>Programme of Study</Label>
          <select
            id="programme-select"
            required
            className={inputClasses}
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
          >
            <option value="" disabled>Select…</option>
            {programmeOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <FieldError messages={fe.programme} />
        </div>
        <div>
          <Label htmlFor="level-select" required>{isPg ? "Year of Study" : "Level"}</Label>
          <select
            id="level-select"
            required
            className={inputClasses}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="" disabled>Select…</option>
            {levelOptions.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <FieldError messages={fe.level} />
        </div>
        <div>
          <Label htmlFor="indexNumber" required>Index Number</Label>
          <input id="indexNumber" name="indexNumber" required value={values.indexNumber} onChange={handleChange} className={`${inputClasses} font-data`} />
          <FieldError messages={fe.indexNumber} />
        </div>
        <div>
          <Label htmlFor="yearOfAdmission" required>Year of Admission</Label>
          <input
            id="yearOfAdmission"
            name="yearOfAdmission"
            type="number"
            required
            value={values.yearOfAdmission}
            onChange={handleChange}
            className={inputClasses}
          />
          <FieldError messages={fe.yearOfAdmission} />
        </div>
        <div>
          <Label htmlFor="expectedGraduationYear">Expected Graduation Year</Label>
          <input
            id="expectedGraduationYear"
            name="expectedGraduationYear"
            type="number"
            value={values.expectedGraduationYear}
            onChange={handleChange}
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="department" required>Category of Special Needs</Label>
        <select id="department" name="department" required className={inputClasses} value={values.department} onChange={handleChange}>
          <option value="" disabled>Select…</option>
          {DISABILITY_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <FieldError messages={fe.department} />
      </div>

      <div>
        <p className="text-sm font-medium text-primary-950 mb-2">Specific Support Needed on Campus</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {SUPPORT_NEEDS.map((need) => (
            <label key={need} className="flex items-start gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                name="specificSupportNeeds"
                value={need}
                checked={values.specificSupportNeeds.includes(need)}
                onChange={(e) => toggleSupportNeed(need, e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line text-primary-800"
              />
              {need}
            </label>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="residentialAddress" required>Residential Address</Label>
          <input
            id="residentialAddress"
            name="residentialAddress"
            required
            value={values.residentialAddress}
            onChange={handleChange}
            className={inputClasses}
          />
          <FieldError messages={fe.residentialAddress} />
        </div>
        <div>
          <Label htmlFor="region" required>Region</Label>
          <select id="region" name="region" required className={inputClasses} value={values.region} onChange={handleChange}>
            <option value="" disabled>Select…</option>
            {GHANA_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <FieldError messages={fe.region} />
        </div>
        <div>
          <Label htmlFor="emergencyContactName" required>Emergency Contact Name</Label>
          <input
            id="emergencyContactName"
            name="emergencyContactName"
            required
            value={values.emergencyContactName}
            onChange={handleChange}
            className={inputClasses}
          />
          <FieldError messages={fe.emergencyContactName} />
        </div>
        <div>
          <Label htmlFor="emergencyContactPhone" required>Emergency Contact Phone</Label>
          <input
            id="emergencyContactPhone"
            name="emergencyContactPhone"
            required
            value={values.emergencyContactPhone}
            onChange={handleChange}
            className={inputClasses}
          />
          <FieldError messages={fe.emergencyContactPhone} />
        </div>
      </div>

      <div className="rounded-lg border border-line p-5">
        <h3 className="font-display font-bold text-sm text-primary-950 mb-1">Document Attachments</h3>
        <p className="text-xs text-slate-light mb-4">
          {attachmentsRequired
            ? "You haven't been physically verified at the Resource Center before, so these are required, same as a first-time application."
            : "You were already verified at the Resource Center previously, so these are optional this time — attach them only if anything has changed."}
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="profilePicture" required={attachmentsRequired}>Passport Picture</Label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-surface-muted border border-line overflow-hidden flex items-center justify-center text-slate-light shrink-0">
                <ImagePlus size={18} />
              </div>
              <input
                ref={passportInputRef}
                id="profilePicture"
                type="file"
                accept="image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp"
                onChange={(e) => handleFileChange("passport", e.target.files?.[0])}
                className="block w-full text-sm text-slate file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-800 file:text-sm file:font-semibold hover:file:bg-primary-100"
              />
            </div>
            {passportError && <p className="mt-1 text-xs text-danger">{passportError}</p>}
            {passportBytes > 0 && !passportError && (
              <p className="mt-1 text-xs text-primary-700 flex items-center gap-1">
                <CheckCircle2 size={13} className="shrink-0" /> Uploaded ({formatBytes(passportBytes)})
              </p>
            )}
            <FieldError messages={fe.profilePicture} />
          </div>
          <div>
            <Label htmlFor="medicalReport" required={attachmentsRequired}>Medical Report / Disability Assessment</Label>
            <input
              ref={medicalInputRef}
              id="medicalReport"
              type="file"
              accept="application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,image/jpeg,.jpg,.jpeg,image/png,.png"
              onChange={(e) => handleFileChange("medical", e.target.files?.[0])}
              className="block w-full text-sm text-slate file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-800 file:text-sm file:font-semibold hover:file:bg-primary-100"
            />
            {medicalError && <p className="mt-1 text-xs text-danger">{medicalError}</p>}
            {medicalBytes > 0 && !medicalError && (
              <p className="mt-1 text-xs text-primary-700 flex items-center gap-1">
                <CheckCircle2 size={13} className="shrink-0" /> Uploaded ({formatBytes(medicalBytes)})
              </p>
            )}
            {medicalFileName && !medicalBytes && (
              <p className="mt-1 text-xs text-ink flex items-center gap-1">
                <FileText size={13} className="shrink-0" /> {medicalFileName}
              </p>
            )}
            <FieldError messages={fe.medicalReportKey} />
          </div>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="agreedToTerms"
          required
          checked={values.agreedToTerms}
          onChange={handleChange}
          className="mt-1 h-4 w-4 rounded border-line text-primary-800"
        />
        <span className="text-sm text-slate leading-relaxed">
          I confirm that all information provided above is accurate, and I consent to the association team
          reviewing my details for official acceptance.
        </span>
      </label>
      <FieldError messages={fe.agreedToTerms} />

      <Button type="submit" disabled={isPending || processingFiles} size="lg" className="w-full">
        {(isPending || processingFiles) && <Loader2 size={16} className="animate-spin" />}
        {processingFiles ? "Uploading attachments…" : isPending ? "Submitting…" : "Submit Application"}
      </Button>
    </form>
  );
}
