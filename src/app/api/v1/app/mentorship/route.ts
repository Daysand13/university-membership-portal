import { type NextRequest } from "next/server";
import { appError, appJson, requireAppActor } from "@/lib/api/app-request";
import { listMentorshipsForMentor, listMentorshipsForStudent, studentName } from "@/lib/services/mentorship-service";
import { liveMentorshipCall } from "@/lib/services/mentorship-call-service";
import { whoIsIn } from "@/lib/mentorship-call";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A student's mentors, or a mentor's students — the same list the portals
 * show, from the same service calls. Patrons have no mentorships.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAppActor(request);
  if ("response" in auth) return auth.response;
  const { actor } = auth;
  if (actor.audience === "PATRON") return appError("Mentorship is for students and graduates.", 403, "wrong_portal");

  const now = new Date();
  if (actor.audience === "MEMBER") {
    const rows = await listMentorshipsForStudent(actor.member.id);
    const live = await Promise.all(rows.map((row) => liveMentorshipCall(row.id, now)));
    return appJson({
      side: "student",
      mentorships: rows.map((row, i) => ({
        id: row.id,
        status: row.status,
        otherName: row.alumni.fullName,
        otherDetail: [row.alumni.profession, row.alumni.programme, `Class of ${row.alumni.graduationYear}`].filter(Boolean).join(" · "),
        unread: row.unreadByStudent,
        lastMessageAt: row.lastMessageAt.toISOString(),
        nextSession: row.sessions[0] ? { scheduledFor: row.sessions[0].scheduledFor.toISOString(), topic: row.sessions[0].topic } : null,
        otherIsInCall: live[i] ? whoIsIn(live[i], now).mentor : false,
      })),
    });
  }

  const rows = await listMentorshipsForMentor(actor.alumni.id);
  const live = await Promise.all(rows.map((row) => liveMentorshipCall(row.id, now)));
  return appJson({
    side: "mentor",
    mentorships: rows.map((row, i) => ({
      id: row.id,
      status: row.status,
      otherName: studentName(row.member),
      otherDetail: [row.member.programme, row.member.level].filter(Boolean).join(" · "),
      unread: row.unreadByMentor,
      lastMessageAt: row.lastMessageAt.toISOString(),
      nextSession: row.sessions[0] ? { scheduledFor: row.sessions[0].scheduledFor.toISOString(), topic: row.sessions[0].topic } : null,
      otherIsInCall: live[i] ? whoIsIn(live[i], now).student : false,
    })),
  });
}
