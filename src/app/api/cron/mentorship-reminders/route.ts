import { NextResponse, type NextRequest } from "next/server";
import { sendTodaysSessionReminders } from "@/lib/services/mentorship-call-service";

/**
 * Run each morning by Vercel Cron (vercel.json): reminds both sides of
 * every mentorship session booked for later today.
 *
 * Vercel sends the project's CRON_SECRET as a bearer token when one is set,
 * and this refuses anything without it. Without one set, it still only
 * ever sends reminders that are due and not yet sent, so somebody calling
 * it by hand can do no more than the morning run would have done.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  const sent = await sendTodaysSessionReminders();
  return NextResponse.json({ sent });
}
