import { type NextRequest } from "next/server";
import { appError, appFieldErrors, appJson, requireAppActor } from "@/lib/api/app-request";
import { checkRateLimit } from "@/lib/rate-limit";
import { mentorshipMessageSchema } from "@/lib/validations/student-portal";
import { MentorshipError, sendMentorshipMessage } from "@/lib/services/mentorship-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Writing in a mentorship conversation from the app. The same service as
 * the website's reply box — the same checks, the same email to the other
 * side, the same rate limit.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAppActor(request);
  if ("response" in auth) return auth.response;
  const { actor } = auth;
  if (actor.audience === "PATRON") return appError("Mentorship is for students and graduates.", 403, "wrong_portal");
  const { id } = await params;

  const parsed = mentorshipMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return appFieldErrors(parsed.error.flatten().fieldErrors);

  const student = actor.audience === "MEMBER";
  const actorId = student ? actor.member.id : actor.alumni.id;
  // The website's own limit and key, so the app adds no allowance of its own.
  const limit = await checkRateLimit(`mentor-message:${actorId}`, { max: 60, windowSeconds: 3600 });
  if (!limit.allowed) return appError("You've sent a lot of messages in a short time. Please wait a while.", 429, "rate_limited");

  try {
    await sendMentorshipMessage({ id, sender: student ? "STUDENT" : "MENTOR", actorId, body: parsed.data.body });
  } catch (err) {
    if (err instanceof MentorshipError) return appError(err.message, 409, "mentorship");
    throw err;
  }
  return appJson({ sent: true });
}
