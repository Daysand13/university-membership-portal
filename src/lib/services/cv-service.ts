import "server-only";
import { db } from "@/lib/db";
import { formatFullName } from "@/lib/format";
import { cvFromRecord, type CvInput } from "@/lib/validations/cv";

/**
 * A member's CV: what they typed, and what goes on the page.
 *
 * Their name, index number and programme come from their membership
 * record rather than being typed again — those are the association's
 * facts, and a CV that disagrees with the register helps nobody.
 */

export async function getCv(memberId: string): Promise<CvInput> {
  const row = await db.memberCv.findUnique({ where: { memberId } });
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
  });
}

export async function saveCv(memberId: string, cv: CvInput) {
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
  };
  return db.memberCv.upsert({
    where: { memberId },
    create: { memberId, ...data },
    update: data,
  });
}

export interface CvDocument {
  fullName: string;
  indexNumber: string;
  programme: string;
  level: string;
  email: string;
  phone: string;
  cv: CvInput;
}

/** Everything the PDF prints, member record and typed CV together. */
export async function loadCvDocument(memberId: string): Promise<CvDocument | null> {
  const [member, cv] = await Promise.all([db.member.findUnique({ where: { id: memberId } }), getCv(memberId)]);
  if (!member) return null;

  return {
    fullName: formatFullName(member.firstName, member.middleName, member.lastName),
    indexNumber: member.indexNumber,
    programme: member.programme,
    level: member.level,
    // What they put on the CV wins: a student often wants a personal
    // address on it rather than the one the association writes to.
    email: cv.contactEmail || member.email,
    phone: cv.contactPhone || member.phone,
    cv,
  };
}
