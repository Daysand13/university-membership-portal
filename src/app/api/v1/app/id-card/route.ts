import { type NextRequest } from "next/server";
import { appJson, requireAppAudience } from "@/lib/api/app-request";
import { getCurrentAcademicYear, hasPaidDuesForYear } from "@/lib/services/dues-service";
import { loadIdCardData } from "@/lib/id-card/id-card-service";
import { renderIdCardPng } from "@/lib/id-card/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A student's association ID card for the app: both sides as images, and
 * what is on it as words - so a screen reader user gets the card's content,
 * not "image". The app keeps a copy on the phone, so the card can be shown
 * with no signal.
 *
 * The same rule as the website's card: dues certify membership, so a
 * student whose dues for this year aren't paid gets the reason, not a card.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAppAudience(request, "MEMBER");
  if ("response" in auth) return auth.response;
  const { member } = auth.actor;

  const academicYear = getCurrentAcademicYear();
  if (!(await hasPaidDuesForYear(member.id, academicYear))) {
    return appJson({
      status: "dues_unpaid",
      message: `Your ID card is issued once your ${academicYear} dues are paid. You can pay on the website, or at the association's office.`,
    });
  }

  // The QR code on the card links to the site. The canonical address, not
  // whichever host this request happened to come through.
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || request.nextUrl.origin;
  const data = await loadIdCardData(member.id, origin);
  if (!data) return appJson({ status: "not_found", message: "We couldn't find your record. Please contact the association." });

  const [front, back] = await Promise.all([renderIdCardPng("front", data), renderIdCardPng("back", data)]);
  return appJson({
    status: "ready",
    academicYear,
    details: {
      fullName: data.fullName,
      indexNumber: data.indexNumber,
      programme: data.programme,
      department: data.department,
      specialNeedsCategory: data.specialNeedsCategory,
      validUntil: data.validUntil,
      website: data.website,
    },
    front: Buffer.from(front).toString("base64"),
    back: Buffer.from(back).toString("base64"),
    issuedAt: new Date().toISOString(),
  });
}
