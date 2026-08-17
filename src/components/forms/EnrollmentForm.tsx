"use client";

import { useActionState, useState } from "react";
import { Loader2, ImagePlus } from "lucide-react";
import { submitEnrollmentAction } from "@/lib/actions/membership-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";

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

const LEVELS = ["100", "200", "300", "400", "Postgraduate (Masters)", "Postgraduate (PhD)"];

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

export function EnrollmentForm() {
  const [state, formAction, isPending] = useActionState(submitEnrollmentAction, initialActionState);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      <FormAlert message={state.error} />

      <SectionCard step={1} title="Personal Information">
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
          <Label htmlFor="lastName" required>Last Name</Label>
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
          <Label htmlFor="phone" required>Phone Number</Label>
          <input id="phone" name="phone" type="tel" required placeholder="024 000 0000" className={inputClasses} />
          <FieldError messages={fe.phone} />
        </div>
        <div>
          <Label htmlFor="email" required>Email Address</Label>
          <input id="email" name="email" type="email" required className={inputClasses} />
          <FieldError messages={fe.email} />
        </div>
        <div>
          <Label htmlFor="profilePicture">Profile Picture</Label>
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
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setPreviewUrl(file ? URL.createObjectURL(file) : null);
              }}
              className="block w-full text-sm text-slate file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-800 file:text-sm file:font-semibold hover:file:bg-primary-100"
            />
          </div>
          <FieldError messages={fe.profilePicture} />
        </div>
      </SectionCard>

      <SectionCard step={2} title="Academic Information">
        <div>
          <Label htmlFor="indexNumber" required>Index Number</Label>
          <input id="indexNumber" name="indexNumber" required className={inputClasses} />
          <FieldError messages={fe.indexNumber} />
        </div>
        <div>
          <Label htmlFor="programme" required>Programme</Label>
          <input id="programme" name="programme" required className={inputClasses} />
          <FieldError messages={fe.programme} />
        </div>
        <div>
          <Label htmlFor="department" required>Department</Label>
          <input id="department" name="department" required className={inputClasses} />
          <FieldError messages={fe.department} />
        </div>
        <div>
          <Label htmlFor="facultySchool" required>Faculty / School</Label>
          <input id="facultySchool" name="facultySchool" required className={inputClasses} />
          <FieldError messages={fe.facultySchool} />
        </div>
        <div>
          <Label htmlFor="level" required>Level</Label>
          <select id="level" name="level" required className={inputClasses} defaultValue="">
            <option value="" disabled>Select…</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <FieldError messages={fe.level} />
        </div>
        <div>
          <Label htmlFor="campus" required>Campus</Label>
          <input id="campus" name="campus" required className={inputClasses} />
          <FieldError messages={fe.campus} />
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

      <SectionCard step={3} title="Contact Information">
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

      <SectionCard step={4} title="Membership Information">
        <div>
          <Label htmlFor="membershipType">Membership Type / Category</Label>
          <select id="membershipType" name="membershipType" className={inputClasses} defaultValue="Regular">
            <option value="Regular">Regular Student Member</option>
            <option value="Postgraduate">Postgraduate Member</option>
            <option value="Associate">Associate Member</option>
          </select>
        </div>
      </SectionCard>

      <div className="rounded-lg border border-line p-6 sm:p-7">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="agreedToTerms" required className="mt-1 h-4 w-4 rounded border-line text-primary-800 focus:ring-primary-600" />
          <span className="text-sm text-slate leading-relaxed">
            I confirm that the information provided is accurate and I agree to the association&apos;s membership
            terms and conditions. I understand my application will be reviewed before my account is activated.
          </span>
        </label>
        <FieldError messages={fe.agreedToTerms} />
      </div>

      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending && <Loader2 size={16} className="animate-spin" />}
        {isPending ? "Submitting Application…" : "Submit Application"}
      </Button>
    </form>
  );
}
