import { appJson } from "@/lib/api/app-request";
import { getAcademicOptions } from "@/lib/services/academic-options-service";
import { getSpecialNeedsCategories } from "@/lib/services/special-needs-category-service";
import {
  CAMPUSES,
  GHANA_REGIONS,
  HALLS_OF_AFFILIATION,
  LEVELS,
  MAX_MEDICAL_REPORT_BYTES,
  MAX_PASSPORT_PICTURE_BYTES,
  MEMBERSHIP_TYPE_LABELS,
  POSTGRAD_DEGREE_CATEGORIES,
  POSTGRAD_LEVELS,
  SUPPORT_NEEDS,
} from "@/lib/validations/membership";
import { PATRON_TITLES } from "@/lib/validations/patron";
import { PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";
import { MEDICAL_REPORT_MIME_TYPES } from "@/lib/client/file-accept";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Everything the sign-up forms offer, in one call.
 *
 * Asked for every time a form opens rather than built into the app,
 * because administrators change these — a new programme, a renamed
 * department, a category of special needs — and an app carrying last
 * term's list would refuse a student the website accepts. The departments,
 * programmes and categories come from the same place the website's forms
 * read them from, and the server checks the choice against them again.
 */
export async function GET() {
  const [academic, specialNeedsCategories] = await Promise.all([getAcademicOptions(), getSpecialNeedsCategories()]);

  return appJson({
    student: {
      membershipTypes: Object.entries(MEMBERSHIP_TYPE_LABELS).map(([value, label]) => ({ value, label })),
      campuses: [...CAMPUSES],
      halls: [...HALLS_OF_AFFILIATION],
      regions: [...GHANA_REGIONS],
      supportNeeds: [...SUPPORT_NEEDS],
      specialNeedsCategories,
      tracks: {
        UNDERGRADUATE: {
          departments: academic.UNDERGRADUATE.departments,
          programmes: academic.UNDERGRADUATE.programmes,
          levels: [...LEVELS],
          degreeCategories: [],
        },
        POSTGRADUATE: {
          departments: academic.POSTGRADUATE.departments,
          programmes: academic.POSTGRADUATE.programmes,
          levels: [...POSTGRAD_LEVELS],
          degreeCategories: [...POSTGRAD_DEGREE_CATEGORIES],
        },
      },
      limits: {
        passportBytes: MAX_PASSPORT_PICTURE_BYTES,
        medicalReportBytes: MAX_MEDICAL_REPORT_BYTES,
        medicalReportTypes: [...MEDICAL_REPORT_MIME_TYPES],
      },
    },
    patron: { titles: [...PATRON_TITLES] },
    passwordRule: PASSWORD_REQUIREMENTS_MESSAGE,
  });
}
