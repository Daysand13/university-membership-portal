import "server-only";
import { db } from "@/lib/db";
import type { MentorshipSender } from "@/generated/prisma/client";
import { isCallLive, shouldRing, whoIsIn } from "@/lib/mentorship-call";
import { MentorshipError } from "@/lib/services/mentorship-service";
import { notifyOfMentorshipCall, notifyOfSessionReminder } from "@/lib/services/portal-notification-service";

/**
 * The record of mentorship calls: that one started, that the other side
 * picked up, how long it went on. Never what was said — nothing is
 * recorded, and the meeting service is told not to allow it.
 *
 * Every function takes the side and the id of the person acting, and finds
 * the mentorship through them, so nobody can touch a call in a mentorship
 * that isn't theirs by posting somebody else's id.
 */

export type CallSide = "student" | "mentor";

const senderOf = (side: CallSide): MentorshipSender => (side === "student" ? "STUDENT" : "MENTOR");

function ownedBy(side: CallSide, actorId: string) {
  return side === "student" ? { memberId: actorId } : { alumniId: actorId };
}

/** The column holding this side's own last check-in. */
const seenField = (side: CallSide) => (side === "student" ? "studentSeenAt" : "mentorSeenAt");

/**
 * Coming into the call. Starts one if nobody is in it — and lets the other
 * side know, by email and on their phone — or joins the one already going.
 */
export async function joinMentorshipCall(params: {
  mentorshipId: string;
  side: CallSide;
  actorId: string;
  withVideo: boolean;
  sessionId?: string | null;
  now?: Date;
}): Promise<{ callId: string; started: boolean }> {
  const { mentorshipId, side, actorId, withVideo } = params;
  const now = params.now ?? new Date();

  const mentorship = await db.mentorship.findFirst({
    where: { id: mentorshipId, ...ownedBy(side, actorId) },
    include: { member: true, alumni: true },
  });
  if (!mentorship) throw new MentorshipError("That mentorship couldn't be found.");
  if (mentorship.status !== "ACTIVE") {
    throw new MentorshipError("This mentorship has ended, so there is no call to join.");
  }

  const latest = await db.mentorshipCall.findFirst({
    where: { mentorshipId },
    orderBy: { startedAt: "desc" },
  });

  if (latest && isCallLive(latest, now)) {
    // Answered the moment both of them are in it, whichever came second.
    const inCall = whoIsIn(latest, now);
    const otherIsIn = side === "student" ? inCall.mentor : inCall.student;
    await db.mentorshipCall.update({
      where: { id: latest.id },
      data: {
        lastSeenAt: now,
        [seenField(side)]: now,
        ...(otherIsIn && !latest.answeredAt ? { answeredAt: now } : {}),
      },
    });
    return { callId: latest.id, started: false };
  }

  // A session id is only kept if it really is one of this mentorship's.
  const sessionId = params.sessionId
    ? ((await db.mentorshipSession.findFirst({ where: { id: params.sessionId, mentorshipId }, select: { id: true } }))?.id ?? null)
    : null;

  const call = await db.mentorshipCall.create({
    data: { mentorshipId, sessionId, startedBy: senderOf(side), withVideo, startedAt: now, lastSeenAt: now, [seenField(side)]: now },
  });

  if (shouldRing(latest?.startedAt ?? null, now)) {
    await notifyOfMentorshipCall({
      mentorship,
      member: mentorship.member,
      mentor: mentorship.alumni,
      startedBy: senderOf(side),
      withVideo,
    });
  }
  return { callId: call.id, started: true };
}

/** Still here. Keeps the call open while anybody is in it. */
export async function callCheckIn(params: {
  callId: string;
  side: CallSide;
  actorId: string;
  now?: Date;
}): Promise<{ live: boolean }> {
  const now = params.now ?? new Date();
  const call = await db.mentorshipCall.findFirst({
    where: { id: params.callId, mentorship: ownedBy(params.side, params.actorId) },
  });
  if (!call || call.endedAt) return { live: false };
  // Somebody who comes back after the call went quiet, or after they had
  // left it, is in a new call; the page asks for one by joining again.
  const inCall = whoIsIn(call, now);
  if (!(params.side === "student" ? inCall.student : inCall.mentor)) return { live: false };
  const otherIsIn = params.side === "student" ? inCall.mentor : inCall.student;
  await db.mentorshipCall.update({
    where: { id: call.id },
    data: { lastSeenAt: now, [seenField(params.side)]: now, ...(otherIsIn && !call.answeredAt ? { answeredAt: now } : {}) },
  });
  return { live: true };
}

/**
 * Leaving. Their side is out of the call from now; the other side, if still
 * there, carries on. The call's last check-in is now, so if they were the
 * last one in, this is when it ended.
 *
 * Each side only ever speaks for itself — a browser tearing a call down can
 * report everybody else leaving too, so nobody is taken at their word about
 * anybody else.
 */
export async function leaveMentorshipCall(params: {
  callId: string;
  side: CallSide;
  actorId: string;
  now?: Date;
}): Promise<void> {
  const now = params.now ?? new Date();
  const call = await db.mentorshipCall.findFirst({
    where: { id: params.callId, endedAt: null, mentorship: ownedBy(params.side, params.actorId) },
  });
  if (!call || !isCallLive(call, now)) return;
  await db.mentorshipCall.update({ where: { id: call.id }, data: { lastSeenAt: now, [seenField(params.side)]: null } });
}

/** The most recent calls, newest first, for the conversation page. */
export async function listMentorshipCalls(mentorshipId: string, take = 10) {
  return db.mentorshipCall.findMany({
    where: { mentorshipId },
    orderBy: { startedAt: "desc" },
    take,
  });
}

/** The call going on right now, if there is one. */
export async function liveMentorshipCall(mentorshipId: string, now: Date = new Date()) {
  const latest = await db.mentorshipCall.findFirst({ where: { mentorshipId }, orderBy: { startedAt: "desc" } });
  return latest && isCallLive(latest, now) ? latest : null;
}

/**
 * The morning reminder: every session booked for today that is still on,
 * in a mentorship that is still active, gets one email to each side.
 *
 * Each session is claimed before it is sent — reminderSentAt goes from
 * empty to now in a single update — so a run that repeats, or two that
 * overlap, never send the same reminder twice.
 */
export async function sendTodaysSessionReminders(now: Date = new Date()): Promise<number> {
  // Ghana is on UTC all year, so "today" is the UTC day.
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const due = await db.mentorshipSession.findMany({
    where: {
      status: "SCHEDULED",
      reminderSentAt: null,
      scheduledFor: { gte: now, lt: endOfDay },
      mentorship: { status: "ACTIVE" },
    },
    include: { mentorship: { include: { member: true, alumni: true } } },
    take: 200,
  });

  let sent = 0;
  for (const session of due) {
    const claimed = await db.mentorshipSession.updateMany({
      where: { id: session.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0) continue;
    await notifyOfSessionReminder({
      mentorshipId: session.mentorshipId,
      member: session.mentorship.member,
      mentor: session.mentorship.alumni,
      session,
    });
    sent += 1;
  }
  return sent;
}
