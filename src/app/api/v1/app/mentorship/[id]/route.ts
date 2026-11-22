import { type NextRequest } from "next/server";
import { appError, appJson, requireAppActor } from "@/lib/api/app-request";
import {
  getMentorshipForMentor,
  getMentorshipForStudent,
  markMentorshipRead,
  studentName,
} from "@/lib/services/mentorship-service";
import { listMentorshipCalls } from "@/lib/services/mentorship-call-service";
import { describeCallLength, isCallLive, whoIsIn } from "@/lib/mentorship-call";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One mentorship: the conversation, the booked sessions and the recent
 * calls. Found through the person asking, so nobody reads a conversation
 * that isn't theirs. Opening it marks it read, as on the website.
 *
 * Calls themselves happen on the website (callPath), where the meeting
 * runs; the app shows whether the other side is waiting in one.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAppActor(request);
  if ("response" in auth) return auth.response;
  const { actor } = auth;
  if (actor.audience === "PATRON") return appError("Mentorship is for students and graduates.", 403, "wrong_portal");
  const { id } = await params;

  const student = actor.audience === "MEMBER";
  const mentorship = student
    ? await getMentorshipForStudent({ memberId: actor.member.id, id })
    : await getMentorshipForMentor({ alumniId: actor.alumni.id, id });
  if (!mentorship) return appError("That mentorship couldn't be found.", 404, "not_found");

  if (student ? mentorship.unreadByStudent : mentorship.unreadByMentor) {
    await markMentorshipRead({ id, side: student ? "student" : "mentor", actorId: student ? actor.member.id : actor.alumni.id });
  }

  const now = new Date();
  const calls = await listMentorshipCalls(id, 10);
  const live = calls.find((call) => isCallLive(call, now));
  const otherName =
    "alumni" in mentorship ? mentorship.alumni.fullName : "member" in mentorship ? studentName(mentorship.member) : "";

  return appJson({
    id: mentorship.id,
    side: student ? "student" : "mentor",
    status: mentorship.status,
    otherName,
    goals: mentorship.goals,
    messages: mentorship.messages.map((message) => ({
      id: message.id,
      mine: (message.sender === "STUDENT") === student,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
    sessions: mentorship.sessions.map((session) => ({
      id: session.id,
      scheduledFor: session.scheduledFor.toISOString(),
      topic: session.topic,
      status: session.status,
    })),
    calls: calls.map((call) => ({
      id: call.id,
      mine: (call.startedBy === "STUDENT") === student,
      withVideo: call.withVideo,
      startedAt: call.startedAt.toISOString(),
      live: isCallLive(call, now),
      length: describeCallLength(call, now),
    })),
    otherIsInCall: live ? (student ? whoIsIn(live, now).mentor : whoIsIn(live, now).student) : false,
    callPath: student ? `/membership/dashboard/mentorship/${id}/call` : `/alumni/mentorship/${id}/call`,
  });
}
