import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

/**
 * What each picture shows, in words, for anyone who cannot see it.
 *
 * A picture with nothing said about it is announced by a screen reader as
 * its file name, or skipped entirely — "the RMU secretary meeting the
 * board" is the difference between knowing what a post is about and not.
 * Descriptions are held against the picture's public URL, so the same
 * picture carries its description wherever it's used, and a picture
 * uploaded long ago can be described without touching the article or event
 * that points at it.
 */

export { MAX_IMAGE_DESCRIPTION } from "@/lib/services/image-description-constants";
import { MAX_IMAGE_DESCRIPTION } from "@/lib/services/image-description-constants";

/** Descriptions for a set of pictures, in one query. Blank URLs are ignored. */
export const describeImages = cache(async (urls: (string | null | undefined)[]): Promise<Map<string, string>> => {
  const wanted = [...new Set(urls.filter((u): u is string => Boolean(u && u.trim())))];
  if (wanted.length === 0) return new Map();
  const rows = await db.imageDescription.findMany({
    where: { url: { in: wanted } },
    select: { url: true, description: true },
  });
  return new Map(rows.map((r) => [r.url, r.description]));
});

/**
 * The words to announce for a picture: what someone wrote about it, or the
 * fallback the page would otherwise have used (a headline, a person's
 * name). An empty fallback marks the picture as decorative, which is the
 * right answer when the page already says everything the picture does.
 */
export function altTextFor(descriptions: Map<string, string>, url: string | null | undefined, fallback: string): string {
  return (url && descriptions.get(url)) || fallback;
}

/** One picture's description, for the admin field that edits it. */
export async function getImageDescription(url: string): Promise<string> {
  const row = await db.imageDescription.findUnique({ where: { url }, select: { description: true } });
  return row?.description ?? "";
}

export async function saveImageDescription(params: { url: string; description: string; adminId: string }) {
  const description = params.description.trim().slice(0, MAX_IMAGE_DESCRIPTION);
  if (!description) {
    // Clearing the box removes the description rather than storing an empty
    // one, so the page falls back to its own wording again.
    await db.imageDescription.deleteMany({ where: { url: params.url } });
    return;
  }
  await db.imageDescription.upsert({
    where: { url: params.url },
    update: { description, updatedById: params.adminId },
    create: { url: params.url, description, updatedById: params.adminId },
  });
}
