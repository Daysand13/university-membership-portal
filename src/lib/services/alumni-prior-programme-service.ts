import "server-only";
import { db } from "@/lib/db";
import type { AlumniProfile } from "@/generated/prisma/client";
import { getAlumniStudyRecords } from "@/lib/services/alumni-service";

/**
 * Undergraduate programmes an alumnus did before their postgraduate study.
 *
 * The association's records often start at a graduate's postgraduate
 * enrollment — their first degree came before the portal existed, or at
 * another university — so a postgraduate alumnus's history reads as if it
 * began with a master's. This lets them fill in the rest themselves. It is
 * their own account, and every screen that shows it says so.
 */

export class PriorProgrammeError extends Error {}

/** More than enough for anyone's undergraduate history; stops runaway lists. */
export const MAX_PRIOR_PROGRAMMES = 6;

/**
 * Who is offered this: an alumnus with postgraduate study on record, or a
 * postgraduate application in progress or approved. Pure, so the rule can
 * be tested on its own.
 */
export function qualifiesForPriorProgrammes(params: {
  recordTracks: ("UNDERGRADUATE" | "POSTGRADUATE" | null)[];
  applications: { track: "UNDERGRADUATE" | "POSTGRADUATE" | null; status: string }[];
}): boolean {
  if (params.recordTracks.includes("POSTGRADUATE")) return true;
  return params.applications.some(
    (a) => a.track === "POSTGRADUATE" && (a.status === "PENDING" || a.status === "UNDER_REVIEW" || a.status === "APPROVED"),
  );
}

export async function getPriorProgrammeState(alumni: Pick<AlumniProfile, "id" | "userId" | "sourceMemberId">) {
  const [{ records, furtherStudiesApplications }, programmes] = await Promise.all([
    getAlumniStudyRecords(alumni),
    listPriorProgrammes(alumni.id),
  ]);
  const eligible =
    programmes.length > 0 ||
    qualifiesForPriorProgrammes({
      recordTracks: records.map((r) => r.track),
      applications: furtherStudiesApplications.map((a) => ({ track: a.applicationTrack, status: a.status })),
    });
  return { eligible, programmes };
}

export async function listPriorProgrammes(alumniId: string) {
  return db.alumniPriorProgramme.findMany({
    where: { alumniId },
    orderBy: [{ yearCompleted: "desc" }, { createdAt: "asc" }],
  });
}

export async function addPriorProgramme(params: {
  alumni: Pick<AlumniProfile, "id" | "userId" | "sourceMemberId">;
  qualification: string;
  programme: string;
  institution: string;
  yearCompleted: number | null;
}) {
  const { alumni, ...fields } = params;
  const { eligible, programmes } = await getPriorProgrammeState(alumni);
  if (!eligible) {
    throw new PriorProgrammeError("This is for graduates doing postgraduate study with the association.");
  }
  if (programmes.length >= MAX_PRIOR_PROGRAMMES) {
    throw new PriorProgrammeError(`You can add up to ${MAX_PRIOR_PROGRAMMES} programmes.`);
  }
  return db.alumniPriorProgramme.create({ data: { alumniId: alumni.id, ...fields } });
}

export async function removePriorProgramme(params: { alumniId: string; id: string }) {
  await db.alumniPriorProgramme.deleteMany({ where: { id: params.id, alumniId: params.alumniId } });
}
