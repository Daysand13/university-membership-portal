import "server-only";
import { db } from "@/lib/db";
import type { AlumniProfile } from "@/generated/prisma/client";
import { getAlumniStudyRecords, type StudyRecord } from "@/lib/services/alumni-service";

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

/** Spelling-insensitive: "B.Ed special Education" and "BEd Special Education" are one programme. */
export function sameProgramme(a: string, b: string): boolean {
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalise(a) === normalise(b);
}

/** The association's own record of what someone has studied, split by whether it's finished. */
export interface RecordedStudy {
  /** Postgraduate programmes on record that haven't been completed. */
  inProgress: string[];
  /** Programmes on record as completed. */
  completed: string[];
}

function recordedStudy(records: Pick<StudyRecord, "programme" | "track" | "status">[]): RecordedStudy {
  return {
    inProgress: records.filter((r) => r.track === "POSTGRADUATE" && r.status !== "GRADUATED").map((r) => r.programme),
    completed: records.filter((r) => r.status === "GRADUATED").map((r) => r.programme),
  };
}

/**
 * Whether the profile's "Class of … · programme" follows the undergraduate
 * programmes the alumnus lists.
 *
 * It does when the profile names a postgraduate programme they're still
 * studying — an alumnus given alumni standing while enrolled on a master's
 * gets that master's copied onto their profile, because nothing about their
 * earlier study is on record — or names one of their listed programmes (it
 * already follows them). A profile naming a programme the association has
 * them completing is an association record, and is never overwritten.
 */
export function profileFollowsPriorProgrammes(params: {
  profileProgramme: string;
  study: RecordedStudy;
  priorProgrammes: string[];
}): boolean {
  const names = (list: string[]) => list.some((p) => sameProgramme(p, params.profileProgramme));
  if (names(params.study.completed)) return false;
  return names(params.study.inProgress) || names(params.priorProgrammes);
}

/**
 * What a following profile should say after the list changes, or null to
 * leave it as it is. The most recently completed programme is the one they
 * graduated in; it sets the class year too when they gave one. With the list
 * emptied, the profile goes back to the postgraduate programme it was
 * copied from — the state before anything was added — so adding a
 * programme again picks it straight back up.
 */
export function graduationFromPriorProgrammes(params: {
  profile: { programme: string; graduationYear: number };
  study: RecordedStudy;
  priorProgrammes: { programme: string; yearCompleted: number | null; createdAt: Date }[];
  /** A programme just taken off the list, which the profile may still name. */
  removedProgramme?: string;
}): { programme: string; graduationYear: number } | null {
  const { profile, study, priorProgrammes, removedProgramme } = params;
  const follows = profileFollowsPriorProgrammes({
    profileProgramme: profile.programme,
    study,
    priorProgrammes: [...priorProgrammes.map((p) => p.programme), ...(removedProgramme ? [removedProgramme] : [])],
  });
  if (!follows) return null;

  const latest = [...priorProgrammes].sort(
    (a, b) =>
      (b.yearCompleted ?? -Infinity) - (a.yearCompleted ?? -Infinity) || b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];

  const next = latest
    ? { programme: latest.programme, graduationYear: latest.yearCompleted ?? profile.graduationYear }
    : study.inProgress[0]
      ? { programme: study.inProgress[0], graduationYear: profile.graduationYear }
      : null;

  if (!next || (next.programme === profile.programme && next.graduationYear === profile.graduationYear)) return null;
  return next;
}

export async function getPriorProgrammeState(
  alumni: Pick<AlumniProfile, "id" | "userId" | "sourceMemberId" | "programme">,
) {
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
  const setsGraduation = profileFollowsPriorProgrammes({
    profileProgramme: alumni.programme,
    study: recordedStudy(records),
    priorProgrammes: programmes.map((p) => p.programme),
  });
  return { eligible, programmes, setsGraduation };
}

export async function listPriorProgrammes(alumniId: string) {
  return db.alumniPriorProgramme.findMany({
    where: { alumniId },
    orderBy: [{ yearCompleted: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }],
  });
}

/**
 * Brings a following profile — and with it the public profile page, the
 * alumni showcase and any spotlight — into line with the list. Recorded in
 * the audit log, since it changes what the public site says about someone.
 */
async function applyPriorProgrammesToProfile(alumniId: string, removedProgramme?: string) {
  const profile = await db.alumniProfile.findUniqueOrThrow({
    where: { id: alumniId },
    select: { id: true, userId: true, sourceMemberId: true, programme: true, graduationYear: true },
  });
  const [{ records }, programmes] = await Promise.all([getAlumniStudyRecords(profile), listPriorProgrammes(alumniId)]);
  const next = graduationFromPriorProgrammes({
    profile,
    study: recordedStudy(records),
    priorProgrammes: programmes,
    removedProgramme,
  });
  if (!next) return;

  await db.$transaction([
    db.alumniProfile.update({ where: { id: alumniId }, data: next }),
    db.auditLog.create({
      data: {
        action: "UPDATE_ALUMNI_GRADUATION_FROM_PRIOR_PROGRAMMES",
        entityType: "AlumniProfile",
        entityId: alumniId,
        previousValue: { programme: profile.programme, graduationYear: profile.graduationYear },
        newValue: next,
        note: "Follows the undergraduate programmes the alumnus listed on their Academic Records.",
      },
    }),
  ]);
}

export async function addPriorProgramme(params: {
  alumni: Pick<AlumniProfile, "id" | "userId" | "sourceMemberId" | "programme">;
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
  const created = await db.alumniPriorProgramme.create({ data: { alumniId: alumni.id, ...fields } });
  await applyPriorProgrammesToProfile(alumni.id);
  return created;
}

export async function removePriorProgramme(params: { alumniId: string; id: string }) {
  const removed = await db.alumniPriorProgramme.findFirst({ where: { id: params.id, alumniId: params.alumniId } });
  if (!removed) return;
  await db.alumniPriorProgramme.delete({ where: { id: removed.id } });
  await applyPriorProgrammesToProfile(params.alumniId, removed.programme);
}
