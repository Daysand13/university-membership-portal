import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * The public alumni showcase.
 *
 * Everything here is written so that privacy is enforced by the query, not
 * by the page that happens to render it. Public readers get a fixed `select`
 * of showcase fields, so a column added to AlumniProfile later — an address,
 * a phone number, an internal note — cannot leak onto the public site just
 * because someone rendered a new field. Email and phone are deliberately
 * absent from that select and must stay absent.
 *
 * Three states, and they are genuinely different:
 *   - private       publicProfile false. Invisible on the public web.
 *   - public        publicProfile true. Has a /alumni/[slug] page.
 *   - featured      public AND has a published spotlight, so they also
 *                   appear in "Our Proud Alumni".
 */

/** The only AlumniProfile columns a public visitor may ever see. */
const PUBLIC_ALUMNI_SELECT = {
  id: true,
  fullName: true,
  publicSlug: true,
  graduationYear: true,
  programme: true,
  profileImageUrl: true,
  bio: true,
  profession: true,
  currentPosition: true,
  currentOrganization: true,
  industry: true,
  currentLocation: true,
  country: true,
  achievements: true,
  linkedinUrl: true,
  twitterUrl: true,
  facebookUrl: true,
  instagramUrl: true,
  websiteUrl: true,
  spotlight: {
    select: {
      headline: true,
      summary: true,
      story: true,
      imageUrl: true,
      category: true,
      quote: true,
      displayOrder: true,
    },
  },
} satisfies Prisma.AlumniProfileSelect;

export type PublicAlumnus = Prisma.AlumniProfileGetPayload<{ select: typeof PUBLIC_ALUMNI_SELECT }>;

/** An alumnus is only ever publicly visible if they're active AND opted in. */
const PUBLICLY_VISIBLE: Prisma.AlumniProfileWhereInput = {
  status: "ACTIVE",
  publicProfile: true,
};

/**
 * The people shown in "Our Proud Alumni" — public, with a spotlight their
 * administrator has actually published. A spotlight that exists but is
 * unpublished is a draft and stays invisible.
 */
export async function listFeaturedAlumni(limit?: number): Promise<PublicAlumnus[]> {
  return db.alumniProfile.findMany({
    where: { ...PUBLICLY_VISIBLE, spotlight: { published: true } },
    select: PUBLIC_ALUMNI_SELECT,
    orderBy: [{ spotlight: { displayOrder: "asc" } }, { fullName: "asc" }],
    ...(limit ? { take: limit } : {}),
  });
}

/** Featured alumni the admin has also chosen to surface on the homepage. */
export async function listHomepageAlumni(limit = 4): Promise<PublicAlumnus[]> {
  return db.alumniProfile.findMany({
    where: { ...PUBLICLY_VISIBLE, spotlight: { published: true, showOnHomepage: true } },
    select: PUBLIC_ALUMNI_SELECT,
    orderBy: [{ spotlight: { displayOrder: "asc" } }, { fullName: "asc" }],
    take: limit,
  });
}

export async function getPublicAlumnusBySlug(slug: string): Promise<PublicAlumnus | null> {
  return db.alumniProfile.findFirst({
    where: { ...PUBLICLY_VISIBLE, publicSlug: slug },
    select: PUBLIC_ALUMNI_SELECT,
  });
}

/** Public counts for the stats strip. Real numbers only — never estimates. */
export async function getPublicAlumniStats() {
  const publicAlumni = await db.alumniProfile.findMany({
    where: PUBLICLY_VISIBLE,
    select: { graduationYear: true, industry: true, country: true },
  });

  const distinct = (values: (string | null)[]) =>
    new Set(values.filter((v): v is string => Boolean(v && v.trim()))).size;

  return {
    total: publicAlumni.length,
    industries: distinct(publicAlumni.map((a) => a.industry)),
    countries: distinct(publicAlumni.map((a) => a.country)),
    graduationYears: new Set(publicAlumni.map((a) => a.graduationYear)).size,
  };
}
