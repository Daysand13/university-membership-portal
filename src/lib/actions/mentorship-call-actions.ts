"use server";

import { withTypedActionErrorHandling } from "./with-error-handling";
import { requireMember } from "@/lib/auth/member";
import { requireAlumni } from "@/lib/auth/alumni";
import { checkRateLimit } from "@/lib/rate-limit";
import { MentorshipError } from "@/lib/services/mentorship-service";
import {
  callCheckIn,
  joinMentorshipCall,
  leaveMentorshipCall,
  type CallSide,
} from "@/lib/services/mentorship-call-service";

/**
 * What the call page tells the server while somebody is in a call: that
 * they came in, that they are still there, that they left.
 *
 * Who is acting always comes from the session — a student's from
 * requireMember, a mentor's from requireAlumni — never from anything the
 * page sends. The side only says which of those to ask.
 */

async function actor(side: CallSide): Promise<string> {
  if (side === "student") return (await requireMember()).id;
  if (side === "mentor") return (await requireAlumni()).id;
  throw new Error("Not authorized.");
}

async function joinCallActionImpl(params: {
  side: CallSide;
  mentorshipId: string;
  withVideo: boolean;
  sessionId?: string | null;
}): Promise<{ callId: string } | { error: string }> {
  try {
    const actorId = await actor(params.side);
    const limit = await checkRateLimit(`call-join:${params.side}:${actorId}`, { max: 40, windowSeconds: 3600 });
    if (!limit.allowed) return { error: "You've joined a lot of calls in a short time. Please wait a few minutes." };
    const { callId } = await joinMentorshipCall({
      mentorshipId: String(params.mentorshipId),
      side: params.side,
      actorId,
      withVideo: Boolean(params.withVideo),
      sessionId: params.sessionId ? String(params.sessionId) : null,
    });
    return { callId };
  } catch (err) {
    if (err instanceof MentorshipError) return { error: err.message };
    if (err && typeof err === "object" && "digest" in err) throw err; // redirect to sign in
    console.error("[mentorship-call] join failed", err);
    return { error: "The call couldn't be started just now. Please try again." };
  }
}

async function callCheckInActionImpl(params: { side: CallSide; callId: string }): Promise<{ live: boolean }> {
  try {
    const actorId = await actor(params.side);
    return await callCheckIn({ callId: String(params.callId), side: params.side, actorId });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    // A missed check-in is not worth interrupting a conversation over.
    return { live: true };
  }
}

async function leaveCallActionImpl(params: { side: CallSide; callId: string }): Promise<void> {
  try {
    const actorId = await actor(params.side);
    await leaveMentorshipCall({ callId: String(params.callId), side: params.side, actorId });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[mentorship-call] leave failed", err);
  }
}

export const joinCallAction = withTypedActionErrorHandling("joinCallAction", joinCallActionImpl);
export const callCheckInAction = withTypedActionErrorHandling("callCheckInAction", callCheckInActionImpl);
export const leaveCallAction = withTypedActionErrorHandling("leaveCallAction", leaveCallActionImpl);
