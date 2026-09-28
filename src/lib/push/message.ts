/**
 * What a notification actually says on the lock screen.
 *
 * Separate from the sending, and with no database or network in it, so the
 * wording can be checked in a test. The wording matters more than it looks:
 * a notification is read in a second, sideways, by somebody doing something
 * else, and "New post" tells them nothing about whether to open it.
 */

export interface PushMessage {
  title: string;
  body: string;
  /** Where tapping it should land, as a path on the site. */
  path: string;
}

/** Trimmed to what a phone will actually show, on a word boundary. */
export function forLockScreen(text: string, limit = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function newsMessage(news: { title: string; excerpt: string; slug: string }): PushMessage {
  return {
    title: forLockScreen(news.title, 80),
    body: forLockScreen(news.excerpt),
    path: `/news/${news.slug}`,
  };
}

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Africa/Accra",
});

export function eventMessage(event: { title: string; venue: string; startDate: Date; slug: string }): PushMessage {
  return {
    title: forLockScreen(event.title, 80),
    // The two things somebody decides on: when, and where.
    body: forLockScreen(`${dateFormat.format(event.startDate)} · ${event.venue}`),
    path: `/events/${event.slug}`,
  };
}

export function eventChangedMessage(event: {
  title: string;
  venue: string;
  startDate: Date;
  slug: string;
}): PushMessage {
  return {
    title: forLockScreen(`Changed: ${event.title}`, 80),
    body: forLockScreen(`Now ${dateFormat.format(event.startDate)} · ${event.venue}`),
    path: `/events/${event.slug}`,
  };
}

/**
 * Firebase takes at most 500 addresses in one call, and a whole
 * association's worth of phones is more than that.
 */
export function batches<T>(items: T[], size = 500): T[][] {
  if (size < 1) throw new Error("A batch has to hold something.");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Whether a dead address should be forgotten.
 *
 * Firebase says UNREGISTERED when an app has been uninstalled and
 * INVALID_ARGUMENT when the token is malformed. Both mean this address will
 * never work again, so keeping it only means failing forever. Anything else
 * — a timeout, Firebase itself being unwell — is temporary, and throwing
 * away a member's notifications over it would be the worse mistake.
 */
export function isDeadToken(errorCode: string | null | undefined): boolean {
  if (!errorCode) return false;
  const code = errorCode.toUpperCase();
  return code.includes("UNREGISTERED") || code.includes("NOT_FOUND") || code.includes("INVALID_ARGUMENT");
}
