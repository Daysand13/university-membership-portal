import "server-only";
import { db } from "@/lib/db";
import type { PushSubject } from "@/generated/prisma/client";
import { isPushConfigured, sendPush } from "@/lib/push/fcm";
import { eventChangedMessage, eventMessage, newsMessage, type PushMessage } from "@/lib/push/message";

/**
 * Telling phones that something has been published.
 *
 * Called from the same services that publish an article or an event, so an
 * administrator presses Publish once and everything that follows is
 * automatic — no second screen, nothing to remember.
 *
 * Three rules hold it together:
 *
 *  1. Once, ever. Publishing, editing, unpublishing and publishing again
 *     all run through here; the push_dispatches table is what stops a
 *     member being buzzed four times about one article.
 *  2. Never fatal. A notification that fails must not fail the publish.
 *     Everything here is caught and logged.
 *  3. Only to phones that asked. Somebody who turned news notifications off
 *     is not in the list, and a phone signed out is not either.
 */

type Preference = "notifyNews" | "notifyEvents" | "notifyAnnouncements";

async function tokensWanting(preference: Preference): Promise<string[]> {
  const rows = await db.mobileDevice.findMany({
    where: { revokedAt: null, pushToken: { not: null }, [preference]: true },
    select: { pushToken: true },
  });
  return [...new Set(rows.map((row) => row.pushToken).filter((token): token is string => Boolean(token)))];
}

/** Forgets addresses Firebase says will never work again. */
async function forget(deadTokens: string[]): Promise<void> {
  if (deadTokens.length === 0) return;
  await db.mobileDevice.updateMany({ where: { pushToken: { in: deadTokens } }, data: { pushToken: null } });
}

async function dispatch(params: {
  subject: PushSubject;
  entityId: string;
  message: PushMessage;
  preference: Preference;
}): Promise<void> {
  const { subject, entityId, message, preference } = params;

  // Claim it first. Two administrators pressing Publish at the same moment
  // is unlikely but not impossible, and the unique key settles it without
  // anybody's phone buzzing twice.
  try {
    await db.pushDispatch.create({
      data: { subject, entityId, title: message.title, body: message.body },
    });
  } catch {
    return; // Already sent for this thing.
  }

  if (!isPushConfigured()) {
    // Recorded above, so it will not be retried later and surprise
    // everybody with a notification about last month's news.
    console.warn("[push] Firebase isn't configured, so nothing was sent for", subject, entityId);
    return;
  }

  const tokens = await tokensWanting(preference);
  const result = await sendPush(tokens, message);
  await forget(result.deadTokens);

  await db.pushDispatch.updateMany({
    where: { subject, entityId },
    data: { sentCount: result.sent, failedCount: result.failed },
  });
}

/** Swallows anything, because publishing must not fail over a notification. */
async function quietly(what: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (err) {
    console.error(`[push] ${what} failed`, err);
  }
}

export async function notifyOfPublishedNews(news: {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
}): Promise<void> {
  await quietly("news notification", () =>
    dispatch({ subject: "NEWS", entityId: news.id, message: newsMessage(news), preference: "notifyNews" }),
  );
}

export async function notifyOfPublishedEvent(event: {
  id: string;
  title: string;
  venue: string;
  startDate: Date;
  slug: string;
}): Promise<void> {
  await quietly("event notification", () =>
    dispatch({ subject: "EVENT", entityId: event.id, message: eventMessage(event), preference: "notifyEvents" }),
  );
}

/**
 * A date or a venue that moved after people were already told.
 *
 * Sent at most once per event, which is the deliberate limit: somebody
 * shuffling a date three times should not buzz the association three
 * times, and the event page always has the truth.
 */
export async function notifyOfChangedEvent(event: {
  id: string;
  title: string;
  venue: string;
  startDate: Date;
  slug: string;
}): Promise<void> {
  await quietly("event change notification", () =>
    dispatch({
      subject: "EVENT_CHANGED",
      entityId: event.id,
      message: eventChangedMessage(event),
      preference: "notifyEvents",
    }),
  );
}
