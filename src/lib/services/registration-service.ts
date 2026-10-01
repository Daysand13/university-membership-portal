import "server-only";
import { z } from "zod";
import type { AlumniProfile, MembershipApplication, PatronProfile } from "@/generated/prisma/client";
import { academicChoiceErrors, enrollmentSchema, specialNeedsCategoryErrors } from "@/lib/validations/membership";
import { alumniRegisterSchema } from "@/lib/validations/alumni";
import { patronRegisterSchema } from "@/lib/validations/patron";
import { getAcademicOptions } from "@/lib/services/academic-options-service";
import { getSpecialNeedsCategories } from "@/lib/services/special-needs-category-service";
import { DuplicateIndexNumberError, submitApplication } from "@/lib/services/membership-service";
import { DuplicateAlumniEmailError, registerAlumni } from "@/lib/services/alumni-service";
import { DuplicatePatronEmailError, registerPatron } from "@/lib/services/patron-service";
import { adoptEnrollmentUpload, EnrollmentUploadError } from "@/lib/services/enrollment-upload-service";
import { isR2Configured } from "@/lib/storage/r2";
import { domainCanReceiveMail } from "@/lib/email-domain-check";

/**
 * Joining the association, whichever door somebody comes in by.
 *
 * The website's forms and the Android app's forms both end here, so an
 * application is checked the same way wherever it was filled in. Before
 * this, each check lived inside a website Server Action; an app that
 * re-implemented them would have drifted from them the first time somebody
 * changed one — an administrator adding a programme, say, which the app
 * would then refuse.
 *
 * What stays with each door is what is genuinely different about it: the
 * website's bot trap is a hidden form field that has no meaning in an app,
 * and each door redirects or answers in its own way. Rate limits stay with
 * the doors too, under the same keys, so the website and the app share one
 * allowance per address rather than doubling it.
 */

export type RegistrationOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; fieldErrors?: Record<string, string[] | undefined>; error?: string };

const NO_MAIL_SERVER =
  "We couldn't find a mail server for this email address — please check for a typo (for example, .com instead of .cim) and try again.";

/** A tick box arrives as `true` from the app and as "on" from a browser form. */
function ticked(value: unknown): boolean {
  return value === true || value === "on" || value === "true";
}

/**
 * Field errors a person can read.
 *
 * A browser form sends every box, empty ones as "", so each field's own
 * "First name is required" fires. A field left out of the request
 * altogether gets zod's "Invalid input: expected string, received
 * undefined" instead — a message for a programmer. The app sends every
 * field too, so this is a backstop rather than the usual path.
 */
function readable(error: z.ZodError): Record<string, string[] | undefined> {
  const out: Record<string, string[] | undefined> = {};
  for (const [field, messages] of Object.entries(error.flatten().fieldErrors as Record<string, string[] | undefined>)) {
    out[field] = messages?.map((message) => (/received undefined$/.test(message) ? "This is required." : message));
  }
  return out;
}

/**
 * A student's application, undergraduate or postgraduate.
 *
 * `tokens` are the signed upload tickets for the passport photo and the
 * medical report. The files themselves went straight to storage before the
 * form was sent; what is checked here is that they really arrived, really
 * are what they claim to be, and were issued by this server.
 */
export async function enrollStudent(
  fields: Record<string, unknown>,
  tokens: { passport: string; medical: string },
): Promise<RegistrationOutcome<MembershipApplication>> {
  const candidate: Record<string, unknown> = {
    ...fields,
    agreedToTerms: ticked(fields.agreedToTerms),
    specificSupportNeeds: Array.isArray(fields.specificSupportNeeds) ? fields.specificSupportNeeds : [],
    // medicalReportKey exists so the schema can enforce "a medical report
    // was attached"; the real value is resolved from the ticket below.
    // Where storage isn't configured at all (local development) uploads are
    // skipped entirely, so requiring a ticket there would make the form
    // impossible to submit.
    medicalReportKey: tokens.medical || !isR2Configured() ? "pending" : "",
  };

  const parsed = enrollmentSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, fieldErrors: readable(parsed.error) };

  // Department, programme and category of special needs must be ones
  // administrators currently offer.
  const [academicOptions, specialNeedsCategories] = await Promise.all([getAcademicOptions(), getSpecialNeedsCategories()]);
  const choiceErrors = {
    ...academicChoiceErrors(academicOptions, parsed.data.track, parsed.data),
    ...specialNeedsCategoryErrors(specialNeedsCategories, parsed.data.department),
  };
  if (Object.keys(choiceErrors).length > 0) return { ok: false, fieldErrors: choiceErrors };

  // Catches the exact mistake that locked a real member out of email-only
  // login elsewhere in this system (gmail.cim instead of gmail.com).
  if (!(await domainCanReceiveMail(parsed.data.email))) {
    return { ok: false, fieldErrors: { email: [NO_MAIL_SERVER] } };
  }

  let profileImageUrl: string | null;
  try {
    profileImageUrl = await adoptEnrollmentUpload("passport", tokens.passport);
  } catch (err) {
    if (err instanceof EnrollmentUploadError) return { ok: false, fieldErrors: { profilePicture: [err.message] } };
    throw err;
  }

  let medicalReportUrl: string | null;
  try {
    medicalReportUrl = await adoptEnrollmentUpload("medical", tokens.medical);
  } catch (err) {
    if (err instanceof EnrollmentUploadError) return { ok: false, fieldErrors: { medicalReportKey: [err.message] } };
    throw err;
  }

  try {
    return { ok: true, value: await submitApplication(parsed.data, profileImageUrl, medicalReportUrl) };
  } catch (err) {
    if (err instanceof DuplicateIndexNumberError) return { ok: false, fieldErrors: { indexNumber: [err.message] } };
    console.error("[enroll]", err);
    return { ok: false, error: "We couldn't submit your application. Please try again in a moment." };
  }
}

/** A graduate joining the alumni network. Active at once — nobody reviews it. */
export async function signUpAlumnus(fields: Record<string, unknown>): Promise<RegistrationOutcome<AlumniProfile>> {
  const parsed = alumniRegisterSchema.safeParse({ ...fields, consent: ticked(fields.consent) });
  if (!parsed.success) return { ok: false, fieldErrors: readable(parsed.error) };

  if (!(await domainCanReceiveMail(parsed.data.email))) {
    return { ok: false, fieldErrors: { email: [NO_MAIL_SERVER] } };
  }

  try {
    return { ok: true, value: await registerAlumni(parsed.data) };
  } catch (err) {
    if (err instanceof DuplicateAlumniEmailError) return { ok: false, fieldErrors: { email: [err.message] } };
    console.error("[alumni-register]", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Somebody offering to support the association. Waits for approval. */
export async function signUpPatron(fields: Record<string, unknown>): Promise<RegistrationOutcome<PatronProfile>> {
  const parsed = patronRegisterSchema.safeParse({ ...fields, consent: ticked(fields.consent) });
  if (!parsed.success) return { ok: false, fieldErrors: readable(parsed.error) };

  if (!(await domainCanReceiveMail(parsed.data.email))) {
    return {
      ok: false,
      fieldErrors: {
        email: ["We couldn't find a mail server for this email address — please check it for a typo and try again."],
      },
    };
  }

  try {
    return { ok: true, value: await registerPatron(parsed.data) };
  } catch (err) {
    if (err instanceof DuplicatePatronEmailError) return { ok: false, fieldErrors: { email: [err.message] } };
    throw err;
  }
}
