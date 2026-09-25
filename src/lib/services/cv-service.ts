import "server-only";
import { db } from "@/lib/db";
import { formatFullName } from "@/lib/format";
import { cvFromRecord, newestFirst, type CvInput } from "@/lib/validations/cv";

/**
 * A CV: what its owner typed, and what goes on the page.
 *
 * Owners are students or graduates. A graduate who was once a student has
 * a second CV rather than an edited one — what an employer wants from an
 * alumnus is not what they wanted from an undergraduate, and the old one
 * is still theirs to look back at.
 *
 * Name, index number and programme come from the association's own record
 * rather than being typed again: a CV that disagrees with the register
 * helps nobody.
 */

export type CvOwner = { kind: "member"; id: string } | { kind: "alumni"; id: string };

function ownerWhere(owner: CvOwner) {
  return owner.kind === "member" ? { memberId: owner.id } : { alumniProfileId: owner.id };
}

export async function getCv(owner: CvOwner): Promise<CvInput> {
  const row = await db.memberCv.findFirst({ where: ownerWhere(owner) });
  if (!row) return cvFromRecord(null);
  return cvFromRecord({
    headline: row.headline ?? "",
    summary: row.summary ?? "",
    contactEmail: row.contactEmail ?? "",
    contactPhone: row.contactPhone ?? "",
    location: row.location ?? "",
    education: row.education,
    experience: row.experience,
    skills: row.skills,
    languages: row.languages,
    activities: row.activities,
    referees: row.referees,
    signatureKind: row.signatureKind,
    signatureData: row.signatureData ?? "",
  });
}

export async function saveCv(owner: CvOwner, cv: CvInput) {
  const data = {
    headline: cv.headline || null,
    summary: cv.summary || null,
    contactEmail: cv.contactEmail || null,
    contactPhone: cv.contactPhone || null,
    location: cv.location || null,
    education: cv.education,
    experience: cv.experience,
    skills: cv.skills,
    languages: cv.languages,
    activities: cv.activities,
    referees: cv.referees,
    signatureKind: cv.signatureKind,
    signatureData: cv.signatureData || null,
  };

  const existing = await db.memberCv.findFirst({ where: ownerWhere(owner), select: { id: true } });
  if (existing) return db.memberCv.update({ where: { id: existing.id }, data });
  return db.memberCv.create({ data: { ...ownerWhere(owner), ...data } });
}

export interface CvDocument {
  fullName: string;
  /** Index number for a student, graduation year for an alumnus. */
  identifier: string;
  programme: string;
  /** "Level 300", "Graduated 2024" — whatever describes where they are. */
  standing: string;
  email: string;
  phone: string;
  cv: CvInput;
}

/**
 * Everything the PDF prints, the association's record and the typed CV
 * together, with the dated sections put in the order an employer reads
 * them: whatever is still going on first, then most recent downwards.
 */
export async function loadCvDocument(owner: CvOwner): Promise<CvDocument | null> {
  const cv = await getCv(owner);
  const ordered: CvInput = {
    ...cv,
    education: newestFirst(cv.education),
    experience: newestFirst(cv.experience),
  };

  if (owner.kind === "member") {
    const member = await db.member.findUnique({ where: { id: owner.id } });
    if (!member) return null;
    return {
      fullName: formatFullName(member.firstName, member.middleName, member.lastName),
      identifier: member.indexNumber,
      programme: member.programme,
      standing: `Level ${member.level}`,
      // What they put on the CV wins: a student often wants a personal
      // address on it rather than the one the association writes to.
      email: cv.contactEmail || member.email,
      phone: cv.contactPhone || member.phone,
      cv: ordered,
    };
  }

  const alumnus = await db.alumniProfile.findUnique({ where: { id: owner.id } });
  if (!alumnus) return null;
  return {
    fullName: alumnus.fullName,
    // A graduate has no index number to quote; their profession is what
    // an employer reads next, where they have given one.
    identifier: alumnus.profession ?? "",
    programme: alumnus.programme,
    standing: `Graduated ${alumnus.graduationYear}`,
    email: cv.contactEmail || alumnus.email,
    phone: cv.contactPhone || alumnus.phone,
    cv: ordered,
  };
}
