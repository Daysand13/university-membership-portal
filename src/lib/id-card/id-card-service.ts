import "server-only";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { formatFullName } from "@/lib/format";
import { getSiteSettings } from "@/lib/services/content-service";
import { endOfAcademicYear, memberCardVerificationUrl } from "@/lib/services/member-card-service";
import { coverJpegDataUri, discLogoDataUri, fetchImageBytes, transparentLogoDataUri } from "./images";
import { ID_CARD_IMAGE_SIZES, type IdCardData } from "./IdCard";

/**
 * Everything printed on a member's ID card, gathered and prepared.
 *
 * Admin-only for now (see the route at api/admin/members/[id]/id-card). It
 * takes a member id rather than reading a session so the same function can
 * serve members from their own portal once ID cards become a paid service.
 */

/** "31 JULY 2027" — the last day the card's QR code verifies. */
export function idCardValidUntil(now: Date = new Date()): string {
  const lastValidMoment = new Date(endOfAcademicYear(now) - 1);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(lastValidMoment)
    .toUpperCase();
}

export async function loadIdCardData(memberId: string, origin: string): Promise<IdCardData | null> {
  const [member, settings] = await Promise.all([db.member.findUnique({ where: { id: memberId } }), getSiteSettings()]);
  if (!member) return null;

  const [photoBytes, associationLogoBytes, universityLogoBytes] = await Promise.all([
    fetchImageBytes(member.profileImageUrl),
    fetchImageBytes(settings.logoUrl),
    fetchImageBytes(settings.universityLogoUrl),
  ]);

  const size = ID_CARD_IMAGE_SIZES;
  const [photo, associationBadge, universityBadge, associationLogo] = await Promise.all([
    photoBytes ? coverJpegDataUri(photoBytes, size.photo.width, size.photo.height, "north") : null,
    associationLogoBytes ? discLogoDataUri(associationLogoBytes, size.logoDisc) : null,
    universityLogoBytes ? discLogoDataUri(universityLogoBytes, size.logoDisc) : null,
    associationLogoBytes ? transparentLogoDataUri(associationLogoBytes, size.backLogo) : null,
  ]);

  // The same link the member's dashboard QR code opens.
  const qrPng = await QRCode.toBuffer(memberCardVerificationUrl(origin, member.id), {
    type: "png",
    width: size.qr,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#15112eff", light: "#ffffffff" },
  });

  let website = origin;
  try {
    website = new URL(origin).host;
  } catch {
    // Keep whatever we were given.
  }

  return {
    fullName: formatFullName(member.firstName, member.middleName, member.lastName),
    indexNumber: member.indexNumber,
    department: member.academicDepartment || "—",
    programme: member.programme,
    specialNeedsCategory: member.department,
    phone: member.phone,
    photo,
    associationBadge,
    universityBadge,
    associationLogo,
    qrCode: `data:image/png;base64,${qrPng.toString("base64")}`,
    validUntil: idCardValidUntil(),
    website,
  };
}
