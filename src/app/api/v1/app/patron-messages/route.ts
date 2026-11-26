import { type NextRequest } from "next/server";
import { appError, appFieldErrors, appJson, requireAppAudience } from "@/lib/api/app-request";
import { checkRateLimit } from "@/lib/rate-limit";
import { threadCreateSchema } from "@/lib/validations/patron-portal";
import { createPatronThread, listExecutiveContacts, listThreadsForPatron } from "@/lib/services/patron-message-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A patron's conversations with the association's executive, and starting
 * a new one - to the whole executive or one position on it. The website's
 * schema, rate limit and service. Unlike the website form, the recipient
 * must be one of the contacts offered: nothing else is anybody's inbox.
 */

export async function GET(request: NextRequest) {
  const auth = await requireAppAudience(request, "PATRON");
  if ("response" in auth) return auth.response;

  const [threads, contacts] = await Promise.all([listThreadsForPatron(auth.actor.patron.id), listExecutiveContacts()]);
  return appJson({
    contacts,
    threads: threads.map((t) => ({
      id: t.id,
      subject: t.subject,
      addressedTo: t.addressedTo,
      status: t.status,
      unread: t.unreadByPatron,
      lastMessageAt: t.lastMessageAt.toISOString(),
      lastMessage: t.messages[0] ? { body: t.messages[0].body.slice(0, 200), fromYou: t.messages[0].sender === "PATRON" } : null,
      messages: t._count.messages,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAppAudience(request, "PATRON");
  if ("response" in auth) return auth.response;
  const { patron } = auth.actor;

  const parsed = threadCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return appFieldErrors(parsed.error.flatten().fieldErrors);
  if (!(await listExecutiveContacts()).includes(parsed.data.addressedTo)) {
    return appFieldErrors({ addressedTo: ["Choose who to write to from the list."] });
  }

  const limit = await checkRateLimit(`patron-thread:${patron.id}`, { max: 15, windowSeconds: 3600 });
  if (!limit.allowed) return appError("You've started several conversations in a short time. Please wait a while.", 429, "rate_limited");

  const thread = await createPatronThread({ patron, ...parsed.data });
  return appJson({ id: thread.id });
}
