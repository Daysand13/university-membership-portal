import { type NextRequest } from "next/server";
import { appError, appFieldErrors, appJson, requireAppAudience } from "@/lib/api/app-request";
import { checkRateLimit } from "@/lib/rate-limit";
import { threadReplySchema } from "@/lib/validations/patron-portal";
import { openThreadForPatron, PatronThreadError, replyAsPatron } from "@/lib/services/patron-message-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One of a patron's conversations: reading it (which marks the executive's
 * replies read, as on the website) and replying. Found through the patron
 * asking, so nobody reads another patron's conversation.
 */

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAppAudience(request, "PATRON");
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const thread = await openThreadForPatron(auth.actor.patron.id, id);
  if (!thread) return appError("That conversation couldn't be found.", 404, "not_found");
  return appJson({
    id: thread.id,
    subject: thread.subject,
    addressedTo: thread.addressedTo,
    status: thread.status,
    messages: thread.messages.map((m) => ({
      id: m.id,
      fromYou: m.sender === "PATRON",
      // As on the website: the executive replies as a team, not by name.
      from: m.sender === "PATRON" ? "You" : "Executive team",
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAppAudience(request, "PATRON");
  if ("response" in auth) return auth.response;
  const { patron } = auth.actor;
  const { id } = await params;

  const parsed = threadReplySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return appFieldErrors(parsed.error.flatten().fieldErrors);

  const limit = await checkRateLimit(`patron-reply:${patron.id}`, { max: 60, windowSeconds: 3600 });
  if (!limit.allowed) return appError("You've sent a lot of replies in a short time. Please wait a while.", 429, "rate_limited");

  try {
    await replyAsPatron({ patron, threadId: id, body: parsed.data.body });
  } catch (err) {
    if (err instanceof PatronThreadError) return appError(err.message, 404, "not_found");
    throw err;
  }
  return appJson({ sent: true });
}
