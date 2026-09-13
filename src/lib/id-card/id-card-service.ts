import "server-only";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { formatFullName } from "@/lib/format";
import { getAboutContent, getSiteSettings } from "@/lib/services/content-service";
import { endOfAcademicYear, memberCardVerificationUrl } from "@/lib/services/member-card-service";
import { containedPngDataUri, coverJpegDataUri, discLogoDataUri, fetchImageBytes } from "./images";
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
  const [member, settings, about] = await Promise.all([
    db.member.findUnique({ where: { id: memberId } }),
    getSiteSettings(),
    getAboutContent(),
  ]);
  if (!member) return null;

  const [photoBytes, associationLogoBytes, universityLogoBytes, pictureBytes] = await Promise.all([
    fetchImageBytes(member.profileImageUrl),
    fetchImageBytes(settings.logoUrl),
    fetchImageBytes(settings.universityLogoUrl),
    fetchImageBytes(about.imageUrl),
  ]);

  const size = ID_CARD_IMAGE_SIZES;
  const [photo, associationBadge, universityBadge, watermark, picture] = await Promise.all([
    photoBytes ? coverJpegDataUri(photoBytes, size.photo.width, size.photo.height, "north") : null,
    associationLogoBytes ? discLogoDataUri(associationLogoBytes, size.logoDisc) : null,
    universityLogoBytes ? discLogoDataUri(universityLogoBytes, size.logoDisc) : null,
    associationLogoBytes ? containedPngDataUri(associationLogoBytes, size.watermark) : null,
    pictureBytes ? coverJpegDataUri(pictureBytes, size.picture.width, size.picture.height) : null,
  ]);
  // Only needed when there's no association picture. Cut round like the header
  // logos, so a logo on an off-white square doesn't show a faint box.
  const medallion = !picture && associationLogoBytes ? await discLogoDataUri(associationLogoBytes, size.medallion, 0.98) : null;

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
    watermark,
    // The association's picture from the About Us page; its logo if there isn't one.
    backPicture: picture
      ? { src: picture, fit: "cover" }
      : medallion
        ? { src: medallion, fit: "contain" }
        : null,
    qrCode: `data:image/png;base64,${qrPng.toString("base64")}`,
    validUntil: idCardValidUntil(),
    website,
  };
}
