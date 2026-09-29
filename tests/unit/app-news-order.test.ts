import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { listPublishedNews } from "@/lib/services/news-service";
import { GET as getNews } from "@/app/api/v1/app/news/route";

/**
 * What order the news comes out in.
 *
 * Reported from a real phone: a newly published article sat at the very
 * bottom of the app's feed. The list was ordered featured-first, which is
 * right for the website's news page — an editor pins something and it
 * stays pinned — and wrong for a feed, where somebody opening the app after
 * an announcement expects that announcement.
 *
 * Both behaviours are pinned down here, because the fix is a fork in one
 * shared function and the risk is quietly changing the website too.
 *
 * Needs a database — run against the staging branch:
 *
 *   npx dotenv -e .env.staging.local -- npx vitest run
 */

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const suite = HAS_DB ? describe : describe.skip;

const stamp = randomUUID().slice(0, 8);
/** In both titles, so `q` can pull back these two rows and nothing else. */
const PROBE = `Ordering probe ${stamp}`;

const made: string[] = [];

suite("the order news comes back in", () => {
  beforeAll(async () => {
    // Deliberately the older one, and the featured one. Under
    // featured-first it leads; in a feed it must not.
    const older = await db.news.create({
      data: {
        title: `${PROBE} — pinned and older`,
        slug: `ordering-probe-${stamp}-older`,
        excerpt: "Published first, and marked featured.",
        body: "Published first, and marked featured.",
        status: "PUBLISHED",
        featured: true,
        publishedAt: new Date("2026-01-01T09:00:00.000Z"),
      },
    });
    const newer = await db.news.create({
      data: {
        title: `${PROBE} — newest`,
        slug: `ordering-probe-${stamp}-newer`,
        excerpt: "Published second, not featured.",
        body: "Published second, not featured.",
        status: "PUBLISHED",
        featured: false,
        publishedAt: new Date("2026-06-01T09:00:00.000Z"),
      },
    });
    made.push(older.id, newer.id);
  });

  afterAll(async () => {
    if (made.length) await db.news.deleteMany({ where: { id: { in: made } } });
  });

  it("gives the app the newest article first, pinned or not", async () => {
    const request = new NextRequest(
      `https://portal.test/api/v1/app/news?pageSize=40&q=${encodeURIComponent(PROBE)}`,
    );
    const body = (await (await getNews(request)).json()) as { news: { title: string }[] };

    expect(body.news).toHaveLength(2);
    // The bug: this was the pinned January article.
    expect(body.news[0]?.title).toContain("newest");
    expect(body.news[1]?.title).toContain("pinned and older");
  });

  it("still pins featured articles for the website's news page", async () => {
    const result = await listPublishedNews({ search: PROBE, pageSize: 40 });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.title).toContain("pinned and older");
    expect(result.items[1]?.title).toContain("newest");
  });

  it("breaks a tie the same way twice", async () => {
    // Two articles published in the same second used to have no defined
    // order at all, which on a paged list can show one of them on two pages
    // and the other on none.
    const sameMoment = new Date("2026-03-03T12:00:00.000Z");
    const twins = await Promise.all(
      ["alpha", "beta"].map((which) =>
        db.news.create({
          data: {
            title: `${PROBE} — tie ${which}`,
            slug: `ordering-probe-${stamp}-tie-${which}`,
            excerpt: "Same published moment as its twin.",
            body: "Same published moment as its twin.",
            status: "PUBLISHED",
            featured: false,
            publishedAt: sameMoment,
          },
        }),
      ),
    );
    made.push(...twins.map((row) => row.id));

    const once = await listPublishedNews({ search: PROBE, pageSize: 40, order: "newest" });
    const again = await listPublishedNews({ search: PROBE, pageSize: 40, order: "newest" });

    expect(once.items.map((row) => row.id)).toEqual(again.items.map((row) => row.id));
  });
});
