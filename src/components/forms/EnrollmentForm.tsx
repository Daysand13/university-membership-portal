"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, ImagePlus, AlertCircle, Pencil, CheckCircle2, FileText } from "lucide-react";
import { submitEnrollmentAction, requestEnrollmentUploadAction } from "@/lib/actions/membership-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { BotProtectionFields } from "@/components/forms/BotProtectionFields";
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
  GHANA_REGIONS,
  type ApplicationTrack,
} from "@/lib/validations/membership";
import { downscaleImage } from "@/lib/client/downscale-image";

const GENDER_LABELS: Record<string, string> = { MALE: "Male", FEMALE: "Female" };

// Every field the form collects, all controlled by React state. This is
// deliberate: React automatically resets *uncontrolled* fields once a
// useActionState action finishes — including when it finishes with a
// validation error, not just on success. If these were left uncontrolled,
// any server-side error (e.g. a duplicate index number) would silently
// wipe the whole form the instant it happened. Controlled state persists
// through that, and through switching back and forth between the form and
// the review screen.
interface FormValues {
  membershipType: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  campus: string;
  hallOfAffiliation: string;
  degreeCategory: string;
  academicDepartment: string;
  programme: string;
  level: string;
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

const INITIAL_VALUES: FormValues = {
  membershipType: "",
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  email: "",
  phone: "",
  campus: "",
  hallOfAffiliation: "",
  degreeCategory: "",
  academicDepartment: "",
  programme: "",
  level: "",
  indexNumber: "",
  yearOfAdmission: "",
  expectedGraduationYear: "",
  department: "",
  specificSupportNeeds: [],
  residentialAddress: "",
  region: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  agreedToTerms: false,
};

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

// Targets for client-side re-encoding. Chosen so that two re-encoded photos
// always land well inside MAX_TOTAL_UPLOAD_BYTES, while still leaving room for
// a medical report that CANNOT be re-encoded — a PDF or Word document keeps
// whatever size it arrived at.
const PASSPORT_TARGET_BYTES = 1024 * 1024; // 1 MB
const MEDICAL_IMAGE_TARGET_BYTES = 2.5 * 1024 * 1024; // 2.5 MB

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Some Android file providers hand back a File with an empty `type`. Falling
 * back to the extension keeps those selections usable; the server verifies the
 * actual bytes either way, so a wrong guess is caught rather than trusted.
 */
function resolveMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "";
}

type UploadOutcome =
  | { status: "ready"; bytes: number; token: string; filename: string; file: File }
  /** R2 isn't configured (local development) — carry on without storing anything. */
  | { status: "skipped"; bytes: number; filename: string; file: File }
  | { status: "error"; message: string };

/**
 * Re-encodes an image where possible, then uploads it straight to R2 and
 * returns the signed ticket naming the stored object.
 *
 * The file bytes never touch the Next.js server: they cannot, because Vercel
 * rejects a Function request body over 4.5MB before the function runs, and
 * this form accepts files that alone exceed that. The form submission carries
 * only the ticket.
 */
async function prepareAndUpload(
  kind: "passport" | "medical",
  file: File,
  targetBytes: number,
): Promise<UploadOutcome> {
  const prepared = await downscaleImage(file, { targetBytes });
  const mimeType = resolveMimeType(prepared);

  let ticket;
  try {
    ticket = await requestEnrollmentUploadAction({
      kind,
      filename: prepared.name,
      mimeType,
      fileSize: prepared.size,
    });
  } catch {
    return {
      status: "error",
      message: "We couldn't start the upload. Please check your connection and try again.",
    };
  }

  if (!ticket.ok) return { status: "error", message: ticket.error };
  if (ticket.mode === "skip") {
    return { status: "skipped", bytes: prepared.size, filename: prepared.name, file: prepared };
  }

  try {
    const response = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: prepared,
    });
    if (!response.ok) {
      // Storage answered and refused: an expired URL or a signature mismatch,
      // not a connectivity problem. Worth separating, because the person
      // retrying won't help and the log line says why.
      const detail = await response.text().catch(() => "");
      console.error("[enroll-upload] storage rejected the upload", response.status, detail.slice(0, 300));
      return { status: "error", message: "We couldn't save that file. Please try attaching it again." };
    }
  } catch (err) {
    // fetch() rejects rather than returning a response when the request never
    // completed at all — genuinely offline, or blocked by the browser before
    // it was sent. In practice the second is far more likely, and means the
    // bucket's CORS policy doesn't list this origin (see the CORS step in
    // README.md). That's a deployment configuration problem, and from here it
    // is indistinguishable from a dropped connection — so log the origin,
    // which is the one detail that tells the two apart in a bug report.
    console.error("[enroll-upload] upload request did not complete", {
      pageOrigin: typeof location === "undefined" ? null : location.origin,
      hint: "if this is a CORS block, add the origin above to the R2 bucket's AllowedOrigins",
      err,
    });
    return {
      status: "error",
      message: "That file didn't finish uploading. Please check your connection and try again.",
    };
  }

  return {
    status: "ready",
    bytes: prepared.size,
    token: ticket.token,
    filename: prepared.name,
    file: prepared,
  };
}

// ---------------------------------------------------------------------------
// Review screen — read-only summary of everything captured in the form,
// read directly from the same controlled state the form itself uses, so it
// can never drift out of sync with what's actually been entered.
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
  values,
  isPg,
  passportPreviewUrl,
  medicalFileName,
  onEdit,
  onConfirm,
  isPending,
}: {
  values: FormValues;
  isPg: boolean;
  passportPreviewUrl: string | null;
  medicalFileName: string | null;
  onEdit: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
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
        <ReviewField
          label="Membership Status"
          value={MEMBERSHIP_TYPE_LABELS[values.membershipType as keyof typeof MEMBERSHIP_TYPE_LABELS] ?? values.membershipType}
        />
      </ReviewSection>

      <ReviewSection title="Personal Identification">
        <ReviewField label="First Name" value={values.firstName} />
        <ReviewField label="Middle Name" value={values.middleName} />
        <ReviewField label="Surname" value={values.lastName} />
        <ReviewField label="Date of Birth" value={values.dateOfBirth} />
        <ReviewField label="Gender" value={GENDER_LABELS[values.gender] ?? values.gender} />
        <ReviewField label="Personal Email Address" value={values.email} />
        <ReviewField label="Phone Number / WhatsApp" value={values.phone} />
      </ReviewSection>

      <ReviewSection title={isPg ? "Campus & Postgraduate Department" : "UEW Campus & Academic Department"}>
        <ReviewField label="UEW Campus" value={values.campus} />
        <ReviewField label="Hall of Affiliation" value={values.hallOfAffiliation} />
        {isPg && <ReviewField label="Postgraduate Degree Category" value={values.degreeCategory} />}
        <ReviewField label="Academic Department" value={values.academicDepartment} />
        <ReviewField label="Program of Study" value={values.programme} />
        <ReviewField label={isPg ? "Year of Study" : "Level"} value={values.level} />
        <ReviewField label="Index Number" value={values.indexNumber} />
        <ReviewField label="Year of Admission" value={values.yearOfAdmission} />
        <ReviewField label="Expected Graduation Year" value={values.expectedGraduationYear} />
      </ReviewSection>

      <ReviewSection title="Category of Special Needs">
        <ReviewField label="Category of Special Needs" value={values.department} />
        <ReviewField
          label="Specific Support Needed on Campus"
          value={
            values.specificSupportNeeds.length > 0 ? (
              <ul className="list-disc list-inside space-y-0.5">
                {values.specificSupportNeeds.map((need) => (
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
        <ReviewField label="Residential Address" value={values.residentialAddress} />
        <ReviewField label="Region" value={values.region} />
        <ReviewField label="Emergency Contact Name" value={values.emergencyContactName} />
        <ReviewField label="Emergency Contact Phone" value={values.emergencyContactPhone} />
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
  const passportInputRef = useRef<HTMLInputElement>(null);
  const medicalInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"form" | "review">("form");
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [medicalFileName, setMedicalFileName] = useState<string | null>(null);
  // Sizes are tracked in bytes rather than as booleans because the limit that
  // actually matters is the COMBINED one: two files that each pass their own
  // check can still add up to a request the platform refuses (see
  // MAX_TOTAL_UPLOAD_BYTES). These record the size staged for upload, i.e.
  // after any re-encoding, not the size originally selected.
  const [passportBytes, setPassportBytes] = useState(0);
  const [medicalBytes, setMedicalBytes] = useState(0);
  // Signed tickets naming the objects already uploaded to R2. These are what
  // the form actually submits in place of the file bytes. Because they live in
  // React state rather than in the (uncontrolled) file inputs, they survive a
  // failed submission — so a duplicate index number no longer costs someone
  // their attachments.
  const [passportToken, setPassportToken] = useState("");
  const [medicalToken, setMedicalToken] = useState("");
  const [passportUploadError, setPassportUploadError] = useState<string | null>(null);
  const [medicalUploadError, setMedicalUploadError] = useState<string | null>(null);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [passportMissing, setPassportMissing] = useState(false);
  const [medicalMissing, setMedicalMissing] = useState(false);
  const fe = state.fieldErrors ?? {};

  // Only the per-file product limits are enforced now. The combined-size cap
  // this form briefly needed is gone with the reason for it: attachments no
  // longer ride along in the submission, so the request body can't outgrow
  // what the platform accepts.
  const passportTooLarge = passportBytes > MAX_PASSPORT_PICTURE_BYTES;
  const medicalTooLarge = medicalBytes > MAX_MEDICAL_REPORT_BYTES;
  const uploadsBlocked =
    passportTooLarge || medicalTooLarge || Boolean(passportUploadError) || Boolean(medicalUploadError);

  const isPg = track === "POSTGRADUATE";
  const departmentOptions = isPg ? POSTGRAD_DEPARTMENTS : ACADEMIC_DEPARTMENTS;
  const programmeOptions = isPg ? POSTGRAD_PROGRAMS : PROGRAMS_OF_STUDY;
  const levelOptions = isPg ? POSTGRAD_LEVELS : LEVELS;
  const levelLabel = isPg ? "Year of Study" : "Level / Year of Study";

  // If the server action comes back with an error (e.g. a duplicate index
  // number — the one thing that can only be checked server-side), jump back
  // to the editable form automatically so the error is actually visible
  // instead of rendering inside a hidden review screen.
  //
  // React clears the (uncontrolled, unavoidably so) file inputs whenever an
  // action finishes, which used to mean re-picking both attachments after any
  // failed submission. It no longer does: the uploads already happened and
  // their tickets live in state, so what the person picked is still attached.
  //
  // Adjusted during render (React's recommended pattern for reacting to a
  // prop/value change) rather than in a useEffect, so it can't cause an extra
  // render-then-fix flash.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.error || (state.fieldErrors && Object.keys(state.fieldErrors).length > 0)) {
      setPhase("form");
    }
  }

  // Scrolling to top is a genuine side-effect on the browser (not React
  // state), so this belongs in an effect — unlike the state adjustment
  // above. Runs whenever the visible phase changes, covering the review
  // click, the edit-application click, and the error-triggered bounce back
  // to the form, all in one place.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSupportNeedToggle(need: string, checked: boolean) {
    setValues((prev) => ({
      ...prev,
      specificSupportNeeds: checked
        ? [...prev.specificSupportNeeds, need]
        : prev.specificSupportNeeds.filter((n) => n !== need),
    }));
  }

  function handleReviewClick() {
    const formEl = formRef.current;
    if (!formEl) return;
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }
    // Attachments are checked from state rather than from the file inputs.
    // React empties those after any failed submission, but the uploads behind
    // them are still in place — reading the inputs would wrongly report that
    // someone had attached nothing.
    if (passportBytes === 0) {
      setPassportMissing(true);
      passportInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (medicalBytes === 0) {
      setMedicalMissing(true);
      medicalInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // A file that's too large, or that failed to upload, stops here with a
    // specific message. This used to reach the server action, where the
    // platform rejected the whole request before any of our code ran and the
    // person just saw a generic error.
    if (uploadsBlocked || processingFiles) {
      passportInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setPhase("review");
  }

  function handleConfirmSubmit() {
    // The form was never unmounted (just hidden), so its current values —
    // including any edits made after going back — are what gets submitted.
    formRef.current?.requestSubmit();
  }

  return (
    <div>
      {phase === "review" && (
        <ReviewScreen
          values={values}
          isPg={isPg}
          passportPreviewUrl={previewUrl}
          medicalFileName={medicalFileName}
          onEdit={() => setPhase("form")}
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
        <BotProtectionFields />

        {/* The attachments themselves are already in R2 by the time this form
            is submitted. These tickets are all that travels with it. */}
        <input type="hidden" name="profilePictureToken" value={passportToken} />
        <input type="hidden" name="medicalReportToken" value={medicalToken} />

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
            <select
              id="membershipType"
              name="membershipType"
              required
              className={inputClasses}
              value={values.membershipType}
              onChange={handleChange}
            >
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
            <input id="firstName" name="firstName" required className={inputClasses} value={values.firstName} onChange={handleChange} />
            <FieldError messages={fe.firstName} />
          </div>
          <div>
            <Label htmlFor="middleName">Middle Name</Label>
            <input id="middleName" name="middleName" className={inputClasses} value={values.middleName} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="lastName" required>Surname</Label>
            <input id="lastName" name="lastName" required className={inputClasses} value={values.lastName} onChange={handleChange} />
            <FieldError messages={fe.lastName} />
          </div>
          <div>
            <Label htmlFor="dateOfBirth" required>Date of Birth</Label>
            <input id="dateOfBirth" name="dateOfBirth" type="date" required className={inputClasses} value={values.dateOfBirth} onChange={handleChange} />
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
          <div>
            <Label htmlFor="email" required>Personal Email Address</Label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="e.g., yourname@gmail.com"
              className={inputClasses}
              value={values.email}
              onChange={handleChange}
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
              value={values.phone}
              onChange={handleChange}
            />
            <FieldError messages={fe.phone} />
          </div>
        </SectionCard>

        <SectionCard step={3} title="UEW Campus & Academic Department">
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
              <option value="">Select…</option>
              {HALLS_OF_AFFILIATION.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <FieldError messages={fe.hallOfAffiliation} />
          </div>
          {isPg && (
            <div className="sm:col-span-2">
              <Label htmlFor="degreeCategory" required>Postgraduate Degree Category</Label>
              <select
                id="degreeCategory"
                name="degreeCategory"
                required
                className={inputClasses}
                value={values.degreeCategory}
                onChange={handleChange}
              >
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
            <select
              id="academicDepartment"
              name="academicDepartment"
              required
              className={inputClasses}
              value={values.academicDepartment}
              onChange={handleChange}
            >
              <option value="" disabled>Select…</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <FieldError messages={fe.academicDepartment} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="programme" required>Program of Study</Label>
            <select id="programme" name="programme" required className={inputClasses} value={values.programme} onChange={handleChange}>
              <option value="" disabled>Select…</option>
              {programmeOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <FieldError messages={fe.programme} />
          </div>
          <div>
            <Label htmlFor="level" required>{levelLabel}</Label>
            <select id="level" name="level" required className={inputClasses} value={values.level} onChange={handleChange}>
              <option value="" disabled>Select…</option>
              {levelOptions.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <FieldError messages={fe.level} />
          </div>
          <div>
            <Label htmlFor="indexNumber" required>Index Number</Label>
            <input id="indexNumber" name="indexNumber" required className={inputClasses} value={values.indexNumber} onChange={handleChange} />
            <FieldError messages={fe.indexNumber} />
          </div>
          <div>
            <Label htmlFor="yearOfAdmission" required>Year of Admission</Label>
            <input
              id="yearOfAdmission"
              name="yearOfAdmission"
              type="number"
              min="2000"
              max="2100"
              required
              className={inputClasses}
              value={values.yearOfAdmission}
              onChange={handleChange}
            />
            <FieldError messages={fe.yearOfAdmission} />
          </div>
          <div>
            <Label htmlFor="expectedGraduationYear">Expected Graduation Year</Label>
            <input
              id="expectedGraduationYear"
              name="expectedGraduationYear"
              type="number"
              min="2000"
              max="2100"
              className={inputClasses}
              value={values.expectedGraduationYear}
              onChange={handleChange}
            />
          </div>
        </SectionCard>

        <SectionCard step={4} title="Category of Special Needs">
          <div className="sm:col-span-2">
            <Label htmlFor="department" required>Category of Special Needs</Label>
            <select id="department" name="department" required className={inputClasses} value={values.department} onChange={handleChange}>
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
                    checked={values.specificSupportNeeds.includes(need)}
                    onChange={(e) => handleSupportNeedToggle(need, e.target.checked)}
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
                ref={passportInputRef}
                id="profilePicture"
                type="file"
                // No `name`, and no `required`, both deliberate.
                //
                // No name: the bytes must not be posted with the form. They go
                // straight to R2 in onChange and only the signed ticket is
                // submitted, which is what keeps this request small enough for
                // the platform to accept at all.
                //
                // No required: React empties file inputs after a failed
                // submission, so native validation would demand a file that is
                // in fact already uploaded. handleReviewClick checks the upload
                // state instead.
                //
                // Concrete MIME types rather than the `image/*` wildcard, for
                // the same reason as the medical report field below: on
                // Chrome for Android a wildcard media type produces a
                // restrictive media picker (Samsung's One UI offers only
                // Camera and Photos), while an explicit list opens the full
                // file browser. This list also matches what the server
                // accepts (ALLOWED_IMAGE_TYPES), so a .heic straight off a
                // phone is refused at the picker instead of after upload.
                accept="image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  setPassportUploadError(null);
                  // A cancelled picker leaves any previous successful upload
                  // alone rather than silently detaching it.
                  if (!file) return;
                  setPassportMissing(false);
                  setProcessingFiles(true);
                  setPreviewUrl(URL.createObjectURL(file));
                  try {
                    const outcome = await prepareAndUpload("passport", file, PASSPORT_TARGET_BYTES);
                    if (outcome.status === "error") {
                      setPassportUploadError(outcome.message);
                      setPassportBytes(0);
                      setPassportToken("");
                      return;
                    }
                    setPassportBytes(outcome.bytes);
                    setPassportToken(outcome.status === "ready" ? outcome.token : "");
                  } finally {
                    setProcessingFiles(false);
                  }
                }}
                className="block w-full text-sm text-slate file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-800 file:text-sm file:font-semibold hover:file:bg-primary-100"
              />
            </div>
            <p className="mt-1 text-xs text-slate-light">
              Clear, recent passport-sized photo on a plain white background. JPG or PNG, max 2MB. On your phone,
              you can choose an existing photo or take a new one.
            </p>
            {passportTooLarge && (
              <p className="mt-1 text-xs text-danger">
                This photo is {formatBytes(passportBytes)}, over the 2MB limit — please choose a smaller file.
              </p>
            )}
            {passportUploadError && <p className="mt-1 text-xs text-danger">{passportUploadError}</p>}
            {passportMissing && (
              <p className="mt-1 text-xs text-danger">Please attach your passport picture before continuing.</p>
            )}
            {passportBytes > 0 && !passportTooLarge && !passportUploadError && (
              <p className="mt-1 text-xs text-primary-700 flex items-center gap-1">
                <CheckCircle2 size={13} className="shrink-0" /> Uploaded ({formatBytes(passportBytes)})
              </p>
            )}
            <FieldError messages={fe.profilePicture} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="medicalReport" required>Medical Report / Disability Assessment</Label>
            <input
              ref={medicalInputRef}
              id="medicalReport"
              type="file"
              // No `name`: like the passport field above, the bytes go straight
              // to R2 and only the signed ticket is submitted with the form.
              //
              // Deliberately does NOT use the `image/*` wildcard here.
              // Chrome on Android turns this list into a system intent, and
              // a wildcard media type makes Android (Samsung's One UI in
              // particular) treat this as a *media* picker — offering only
              // Camera and "Photos & videos", with no way to reach a saved
              // PDF in My Files or Drive. Listing concrete MIME types
              // instead produces a document-picker intent that exposes the
              // full file browser. Extensions are listed alongside each
              // MIME type because some Android file providers match on one
              // and some on the other.
              //
              // This also brings the field in line with what the server
              // actually accepts (see ALLOWED_DOCUMENT_TYPES): the old
              // wildcard let people pick formats like .webp or .heic that
              // the server would then reject after upload.
              accept="application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,image/jpeg,.jpg,.jpeg,image/png,.png"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                setMedicalUploadError(null);
                // A cancelled picker leaves any previous successful upload
                // alone rather than silently detaching it.
                if (!file) return;
                setMedicalMissing(false);
                setProcessingFiles(true);
                setMedicalFileName(file.name);
                try {
                  // A PDF or Word document uploads untouched; only a photo of a
                  // report gets re-encoded first.
                  const outcome = await prepareAndUpload("medical", file, MEDICAL_IMAGE_TARGET_BYTES);
                  if (outcome.status === "error") {
                    setMedicalUploadError(outcome.message);
                    setMedicalBytes(0);
                    setMedicalToken("");
                    return;
                  }
                  setMedicalBytes(outcome.bytes);
                  setMedicalToken(outcome.status === "ready" ? outcome.token : "");
                  setMedicalFileName(outcome.filename);
                } finally {
                  setProcessingFiles(false);
                }
              }}
              className="block w-full text-sm text-slate file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-800 file:text-sm file:font-semibold hover:file:bg-primary-100"
            />
            <p className="mt-1.5 text-xs text-slate-light">
              Upload your medical report as a PDF, Word document, or a clear photo (JPG or PNG). Max 5MB. On a
              phone this opens your file browser, so you can pick a saved file from My Files, Downloads or Drive
              — or choose a photo you&apos;ve already taken.
            </p>
            {medicalTooLarge && (
              <p className="mt-1 text-xs text-danger">
                This file is {formatBytes(medicalBytes)}, over the 5MB limit — please choose a smaller file.
              </p>
            )}
            {medicalUploadError && <p className="mt-1 text-xs text-danger">{medicalUploadError}</p>}
            {medicalMissing && (
              <p className="mt-1 text-xs text-danger">Please attach your medical report before continuing.</p>
            )}
            {medicalBytes > 0 && !medicalTooLarge && !medicalUploadError && (
              <p className="mt-1 text-xs text-primary-700 flex items-center gap-1">
                <CheckCircle2 size={13} className="shrink-0" /> Uploaded ({formatBytes(medicalBytes)})
              </p>
            )}
            <FieldError messages={fe.medicalReportKey} />
          </div>
          {processingFiles && (
            <p className="sm:col-span-2 text-xs text-slate-light flex items-center gap-1.5">
              <Loader2 size={13} className="animate-spin shrink-0" /> Uploading your attachments…
            </p>
          )}
        </SectionCard>

        <SectionCard step={6} title="Additional Information">
          <div className="sm:col-span-2">
            <Label htmlFor="residentialAddress" required>Residential Address</Label>
            <input
              id="residentialAddress"
              name="residentialAddress"
              required
              className={inputClasses}
              value={values.residentialAddress}
              onChange={handleChange}
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
          <div />
          <div>
            <Label htmlFor="emergencyContactName" required>Emergency Contact Name</Label>
            <input
              id="emergencyContactName"
              name="emergencyContactName"
              required
              className={inputClasses}
              value={values.emergencyContactName}
              onChange={handleChange}
            />
            <FieldError messages={fe.emergencyContactName} />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone" required>Emergency Contact Phone</Label>
            <input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              type="tel"
              required
              className={inputClasses}
              value={values.emergencyContactPhone}
              onChange={handleChange}
            />
            <FieldError messages={fe.emergencyContactPhone} />
          </div>
        </SectionCard>

        <div className="rounded-lg border border-line p-6 sm:p-7">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="agreedToTerms"
              required
              checked={values.agreedToTerms}
              onChange={(e) => setValues((prev) => ({ ...prev, agreedToTerms: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-line text-primary-800 focus:ring-primary-600"
            />
            <span className="text-sm text-slate leading-relaxed">
              I confirm that I have registered at the Resource Center for Students with Special Needs (FES Block,
              Room 104), that all information provided is accurate, and I consent to the association team
              reviewing my details for official acceptance.
            </span>
          </label>
          <FieldError messages={fe.agreedToTerms} />
        </div>

        <div className="rounded-lg border border-accent-300 bg-accent-50 p-4 flex gap-3">
          <AlertCircle size={18} className="text-accent-600 shrink-0 mt-0.5" />
          <p className="text-sm text-primary-950 leading-relaxed">
            Please critically review every section of this form before you continue. You&apos;ll see a full
            summary on the next screen, but it&apos;s much easier to correct a mistake now than after your
            application has been submitted for review.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleReviewClick}
          disabled={processingFiles}
          size="lg"
          className="w-full"
        >
          {processingFiles ? "Uploading attachments…" : "Review Application"}
        </Button>
      </form>
    </div>
  );
}
