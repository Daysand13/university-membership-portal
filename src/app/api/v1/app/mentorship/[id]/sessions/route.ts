import { type NextRequest } from "next/server";
import { appError, appFieldErrors, appJson, requireAppActor } from "@/lib/api/app-request";
import { mentorshipSessionSchema } from "@/lib/validations/student-portal";
import { bookMentorshipSession, MentorshipError } from "@/lib/services/mentorship-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Booking a mentorship session from the app, by either side. The website's
 * schema and service - the other side is told by email, and it shows on
 * both conversation pages and in the morning reminder.
 *
 * `scheduledFor` is "YYYY-MM-DDTHH:MM" in Ghana time, as the website sends it.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAppActor(request);
  if ("response" in auth) return auth.response;
  const { actor } = auth;
  if (actor.audience === "PATRON") return appError("Mentorship is for students and graduates.", 403, "wrong_portal");
  const { id } = await params;

  const parsed = mentorshipSessionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return appFieldErrors(parsed.error.flatten().fieldErrors);

  const student = actor.audience === "MEMBER";
  try {
    const session = await bookMentorshipSession({
      id,
      bookedByStudent: student,
      actorId: student ? actor.member.id : actor.alumni.id,
      // Ghana is on UTC all year, so the time as typed is the time in UTC.
      scheduledFor: new Date(`${parsed.data.scheduledFor}:00Z`),
      topic: parsed.data.topic?.trim() ? parsed.data.topic.trim() : null,
    });
    return appJson({ id: session.id, scheduledFor: session.scheduledFor.toISOString() });
  } catch (err) {
    if (err instanceof MentorshipError) return appError(err.message, 409, "mentorship");
    throw err;
  }
}
