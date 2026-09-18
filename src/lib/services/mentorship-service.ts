import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { AlumniProfile, Member, MentorshipSender } from "@/generated/prisma/client";
import { formatFullName } from "@/lib/format";
import {
  notifyMentorOfRequest,
  notifyMentorshipDecision,
  notifyOfMentorshipMessage,
  notifyOfMentorshipSession,
} from "@/lib/services/portal-notification-service";

/**
 * Mentorship: a student asks a graduate for guidance, the graduate takes it
 * up (or doesn't), and from then on they have a private conversation and a
 * short list of agreed sessions.
 *
 * It is kept inside the portal on purpose. Students with special needs are
 * asked for their email address often enough; pairing them with a stranger
 * shouldn't be another occasion for it. Neither side sees the other's
 * address — only the name, the course and the conversation.
 */

export class MentorshipError extends Error {}

const CONVERSATION_INCLUDE = {
  messages: { orderBy: { createdAt: "asc" } },
  sessions: { orderBy: { scheduledFor: "asc" } },
} as const;

export function studentName(member: Pick<Member, "firstName" | "middleName" | "lastName">): string {
  return formatFullName(member.firstName, member.middleName, member.lastName);
}

// ---------------------------------------------------------------------------
// Finding a mentor
// ---------------------------------------------------------------------------

export interface MentorListing {
  id: string;
  fullName: string;
  programme: string;
  graduationYear: number;
  profession: string | null;
  currentPosition: string | null;
  currentOrganization: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  availability: string | null;
  /** How many students they're already guiding, against what they offered. */
  activeMentees: number;
  capacity: number;
  hasRoom: boolean;
  /** This student's existing pairing with them, if there is one. */
  myStatus: "REQUESTED" | "ACTIVE" | "DECLINED" | "ENDED" | null;
}

/**
 * Graduates offering to mentor, with the student's own standing with each.
 * A mentor at capacity is still listed, marked as full: a student should be
 * able to see who is out there even when nobody is free this week.
 */
export async function listAvailableMentors(memberId: string): Promise<MentorListing[]> {
  const mentors = await db.alumniProfile.findMany({
    where: { willingToMentor: true, status: "ACTIVE" },
    orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      programme: true,
      graduationYear: true,
      profession: true,
      currentPosition: true,
      currentOrganization: true,
      bio: true,
      profileImageUrl: true,
      mentorAvailability: true,
      mentorCapacity: true,
      mentorships: {
        where: { OR: [{ status: "ACTIVE" }, { memberId }] },
        select: { memberId: true, status: true },
      },
    },
    take: 200,
  });

  return mentors.map((mentor) => {
    const activeMentees = mentor.mentorships.filter((m) => m.status === "ACTIVE").length;
    const mine = mentor.mentorships.find((m) => m.memberId === memberId);
    return {
      id: mentor.id,
      fullName: mentor.fullName,
      programme: mentor.programme,
      graduationYear: mentor.graduationYear,
      profession: mentor.profession,
      currentPosition: mentor.currentPosition,
      currentOrganization: mentor.currentOrganization,
      bio: mentor.bio,
      profileImageUrl: mentor.profileImageUrl,
      availability: mentor.mentorAvailability,
      activeMentees,
      capacity: mentor.mentorCapacity,
      hasRoom: activeMentees < mentor.mentorCapacity,
      myStatus: mine?.status ?? null,
    };
  });
}

export async function requestMentorship(params: {
  member: Pick<Member, "id" | "firstName" | "middleName" | "lastName" | "level" | "programme">;
  alumniId: string;
  requestNote: string;
}) {
  const { member, alumniId, requestNote } = params;
  const mentor = await db.alumniProfile.findFirst({
    where: { id: alumniId, willingToMentor: true, status: "ACTIVE" },
    include: { mentorships: { where: { status: "ACTIVE" }, select: { id: true } } },
  });
  if (!mentor) throw new MentorshipError("That mentor isn't taking students at the moment.");
  if (mentor.mentorships.length >= mentor.mentorCapacity) {
    throw new MentorshipError(`${mentor.fullName} is already guiding as many students as they offered to take.`);
  }

  const existing = await db.mentorship.findUnique({
    where: { memberId_alumniId: { memberId: member.id, alumniId } },
  });
  if (existing && (existing.status === "REQUESTED" || existing.status === "ACTIVE")) {
    throw new MentorshipError("You've already asked this mentor.");
  }

  // Asking again after a decline or an ended pairing re-opens the same row,
  // so one student and one mentor never accumulate a pile of records.
  const mentorship = existing
    ? await db.mentorship.update({
        where: { id: existing.id },
        data: {
          status: "REQUESTED",
          requestNote,
          respondedAt: null,
          declineReason: null,
          endedAt: null,
          unreadByMentor: true,
          lastMessageAt: new Date(),
        },
      })
    : await db.mentorship.create({ data: { memberId: member.id, alumniId, requestNote } });

  await notifyMentorOfRequest({ mentor, member, requestNote });
  return mentorship;
}

export async function respondToMentorshipRequest(params: {
  id: string;
  alumniId: string;
  decision: "ACCEPT" | "DECLINE";
  goals: string | null;
  declineReason: string | null;
}) {
  const { id, alumniId, decision, goals, declineReason } = params;
  const mentorship = await db.mentorship.findFirst({
    where: { id, alumniId, status: "REQUESTED" },
    include: { member: true, alumni: true },
  });
  if (!mentorship) throw new MentorshipError("That request is no longer waiting for an answer.");

  const updated = await db.mentorship.update({
    where: { id },
    data: {
      status: decision === "ACCEPT" ? "ACTIVE" : "DECLINED",
      goals: decision === "ACCEPT" ? goals : null,
      declineReason: decision === "DECLINE" ? declineReason : null,
      respondedAt: new Date(),
      unreadByStudent: true,
      unreadByMentor: false,
    },
    include: { member: true, alumni: true },
  });

  await notifyMentorshipDecision({
    member: updated.member,
    mentor: updated.alumni,
    accepted: decision === "ACCEPT",
    reason: declineReason,
  });
  return updated;
}

export async function endMentorship(params: { id: string; by: "student" | "mentor"; actorId: string }) {
  const { id, by, actorId } = params;
  const where = by === "student" ? { id, memberId: actorId } : { id, alumniId: actorId };
  const mentorship = await db.mentorship.findFirst({ where, select: { id: true, status: true } });
  if (!mentorship || mentorship.status !== "ACTIVE") throw new MentorshipError("That mentorship isn't active.");
  await db.mentorship.update({ where: { id }, data: { status: "ENDED", endedAt: new Date() } });
}

// ---------------------------------------------------------------------------
// Both sides' lists
// ---------------------------------------------------------------------------

export async function listMentorshipsForStudent(memberId: string) {
  return db.mentorship.findMany({
    where: { memberId },
    orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }],
    include: {
      alumni: { select: { id: true, fullName: true, programme: true, graduationYear: true, profession: true, profileImageUrl: true } },
      sessions: { where: { status: "SCHEDULED" }, orderBy: { scheduledFor: "asc" }, take: 1 },
      _count: { select: { messages: true } },
    },
  });
}

export async function listMentorshipsForMentor(alumniId: string) {
  return db.mentorship.findMany({
    where: { alumniId },
    orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }],
    include: {
      member: { select: { id: true, firstName: true, middleName: true, lastName: true, level: true, programme: true, profileImageUrl: true } },
      sessions: { where: { status: "SCHEDULED" }, orderBy: { scheduledFor: "asc" }, take: 1 },
      _count: { select: { messages: true } },
    },
  });
}

/** The one active mentor a student's dashboard tile talks about. */
export async function getActiveMentorship(memberId: string) {
  return db.mentorship.findFirst({
    where: { memberId, status: "ACTIVE" },
    orderBy: { lastMessageAt: "desc" },
    include: {
      alumni: { select: { id: true, fullName: true, profession: true } },
      sessions: { where: { status: "SCHEDULED" }, orderBy: { scheduledFor: "asc" }, take: 1 },
    },
  });
}

export async function getMentorshipForStudent(params: { memberId: string; id: string }) {
  return db.mentorship.findFirst({
    where: { id: params.id, memberId: params.memberId },
    include: {
      ...CONVERSATION_INCLUDE,
      alumni: {
        select: { id: true, fullName: true, programme: true, graduationYear: true, profession: true, currentPosition: true, currentOrganization: true, profileImageUrl: true, mentorAvailability: true },
      },
    },
  });
}

export async function getMentorshipForMentor(params: { alumniId: string; id: string }) {
  return db.mentorship.findFirst({
    where: { id: params.id, alumniId: params.alumniId },
    include: {
      ...CONVERSATION_INCLUDE,
      member: {
        select: { id: true, firstName: true, middleName: true, lastName: true, level: true, programme: true, academicDepartment: true, profileImageUrl: true },
      },
    },
  });
}

export async function markMentorshipRead(params: { id: string; side: "student" | "mentor"; actorId: string }) {
  const { id, side, actorId } = params;
  await db.mentorship.updateMany({
    where: side === "student" ? { id, memberId: actorId } : { id, alumniId: actorId },
    data: side === "student" ? { unreadByStudent: false } : { unreadByMentor: false },
  });
}

export async function countUnreadMentorships(params: { side: "student" | "mentor"; actorId: string }): Promise<number> {
  const { side, actorId } = params;
  return db.mentorship.count({
    where:
      side === "student"
        ? { memberId: actorId, unreadByStudent: true, status: { in: ["ACTIVE", "DECLINED"] } }
        : { alumniId: actorId, unreadByMentor: true, status: { in: ["REQUESTED", "ACTIVE"] } },
  });
}

// ---------------------------------------------------------------------------
// Conversation and sessions
// ---------------------------------------------------------------------------

export async function sendMentorshipMessage(params: {
  id: string;
  sender: MentorshipSender;
  actorId: string;
  body: string;
}) {
  const { id, sender, actorId, body } = params;
  const mentorship = await db.mentorship.findFirst({
    where: sender === "STUDENT" ? { id, memberId: actorId } : { id, alumniId: actorId },
    include: { member: true, alumni: true },
  });
  if (!mentorship) throw new MentorshipError("That conversation couldn't be found.");
  if (mentorship.status !== "ACTIVE") throw new MentorshipError("This mentorship isn't active any more.");

  await db.mentorshipMessage.create({ data: { mentorshipId: id, sender, body } });
  await db.mentorship.update({
    where: { id },
    data: {
      lastMessageAt: new Date(),
      unreadByStudent: sender === "MENTOR",
      unreadByMentor: sender === "STUDENT",
    },
  });

  await notifyOfMentorshipMessage({
    mentorship,
    member: mentorship.member,
    mentor: mentorship.alumni,
    sender,
    body,
  });
}

export async function bookMentorshipSession(params: {
  id: string;
  bookedByStudent: boolean;
  actorId: string;
  scheduledFor: Date;
  topic: string | null;
}) {
  const { id, bookedByStudent, actorId, scheduledFor, topic } = params;
  const mentorship = await db.mentorship.findFirst({
    where: bookedByStudent ? { id, memberId: actorId } : { id, alumniId: actorId },
    include: { member: true, alumni: true },
  });
  if (!mentorship) throw new MentorshipError("That mentorship couldn't be found.");
  if (mentorship.status !== "ACTIVE") throw new MentorshipError("This mentorship isn't active any more.");

  const session = await db.mentorshipSession.create({
    data: { mentorshipId: id, scheduledFor, topic, bookedByStudent },
  });
  await db.mentorship.update({
    where: { id },
    data: { unreadByStudent: !bookedByStudent, unreadByMentor: bookedByStudent },
  });

  await notifyOfMentorshipSession({
    member: mentorship.member,
    mentor: mentorship.alumni,
    session,
    bookedByStudent,
    cancelled: false,
  });
  return session;
}

export async function setSessionStatus(params: {
  sessionId: string;
  status: "COMPLETED" | "CANCELLED";
  by: "student" | "mentor";
  actorId: string;
}) {
  const { sessionId, status, by, actorId } = params;
  const session = await db.mentorshipSession.findFirst({
    where: {
      id: sessionId,
      mentorship: by === "student" ? { memberId: actorId } : { alumniId: actorId },
    },
    include: { mentorship: { include: { member: true, alumni: true } } },
  });
  if (!session) throw new MentorshipError("That session couldn't be found.");
  if (session.status !== "SCHEDULED") throw new MentorshipError("That session has already been closed off.");

  await db.mentorshipSession.update({ where: { id: sessionId }, data: { status } });
  if (status === "CANCELLED") {
    await notifyOfMentorshipSession({
      member: session.mentorship.member,
      mentor: session.mentorship.alumni,
      session,
      bookedByStudent: by === "student",
      cancelled: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Numbers for the dashboards
// ---------------------------------------------------------------------------

export interface MentorMetrics {
  activeMentees: number;
  totalMentees: number;
  pendingRequests: number;
  sessionsCompleted: number;
  nextSession: { scheduledFor: Date; studentName: string; topic: string | null } | null;
}

export async function getMentorMetrics(alumniId: string): Promise<MentorMetrics> {
  const [activeMentees, totalMentees, pendingRequests, sessionsCompleted, next] = await Promise.all([
    db.mentorship.count({ where: { alumniId, status: "ACTIVE" } }),
    db.mentorship.count({ where: { alumniId, status: { in: ["ACTIVE", "ENDED"] } } }),
    db.mentorship.count({ where: { alumniId, status: "REQUESTED" } }),
    db.mentorshipSession.count({ where: { mentorship: { alumniId }, status: "COMPLETED" } }),
    db.mentorshipSession.findFirst({
      where: { mentorship: { alumniId, status: "ACTIVE" }, status: "SCHEDULED", scheduledFor: { gte: new Date() } },
      orderBy: { scheduledFor: "asc" },
      include: { mentorship: { include: { member: { select: { firstName: true, middleName: true, lastName: true } } } } },
    }),
  ]);

  return {
    activeMentees,
    totalMentees,
    pendingRequests,
    sessionsCompleted,
    nextSession: next
      ? { scheduledFor: next.scheduledFor, studentName: studentName(next.mentorship.member), topic: next.topic }
      : null,
  };
}

/** Association-wide mentorship figures, for the patrons' membership page. */
export async function getMentorshipTotals() {
  const [mentorsOffering, activePairings, sessionsCompleted] = await Promise.all([
    db.alumniProfile.count({ where: { willingToMentor: true, status: "ACTIVE" } }),
    db.mentorship.count({ where: { status: "ACTIVE" } }),
    db.mentorshipSession.count({ where: { status: "COMPLETED" } }),
  ]);
  return { mentorsOffering, activePairings, sessionsCompleted };
}

/** Narrows a duplicate-key crash into something worth showing a person. */
export function isDuplicateRequest(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export type MentorProfile = Pick<AlumniProfile, "id" | "fullName" | "email">;
