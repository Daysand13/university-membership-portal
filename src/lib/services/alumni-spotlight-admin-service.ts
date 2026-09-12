import "server-only";
import { db } from "@/lib/db";
import {
  notifyAlumniVisibilityChange,
  type AlumniVisibilityChange,
} from "@/lib/services/account-notification-service";

/**
 * Administrator side of the alumni showcase: making an existing alumnus
 * public, and writing the spotlight that puts them on the /alumni page.
 *
 * Deliberately operates on the AlumniProfile that already exists. Featuring
 * someone never creates a second account or a parallel alumni record — one
 * identity, with the showcase as a presentation layer over it.
 */

/**
 * Slugs that would collide with a real page under /alumni. The dynamic
 * [slug] route sits alongside static ones like /alumni/dashboard, and Next
 * resolves the static route first — so a slug matching one of these would
 * silently never be reachable. Minting a distinct slug instead is clearer
 * than shipping a profile page nobody can open.
 */
const RESERVED_SLUGS = new Set([
  "dashboard",
  "career",
  "records",
  "events",
  "directory",
  "login",
  "register",
  "profile",
  "stories",
  "mentorship",
  "further-studies",
  "forgot-password",
  "reset-password",
]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * A stable, readable, unique slug for someone's public profile. Falls back
 * to their graduation year and then a counter, so two graduates with the
 * same name both get a working address.
 */
async function mintPublicSlug(fullName: string, graduationYear: number, alumniId: string): Promise<string> {
  const base = slugify(fullName) || "alumnus";
  const candidates = [base, `${base}-${graduationYear}`];

  for (const candidate of candidates) {
    if (RESERVED_SLUGS.has(candidate)) continue;
    const taken = await db.alumniProfile.findFirst({
      where: { publicSlug: candidate, id: { not: alumniId } },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  for (let n = 2; n < 100; n++) {
    const candidate = `${base}-${graduationYear}-${n}`;
    const taken = await db.alumniProfile.findFirst({
      where: { publicSlug: candidate, id: { not: alumniId } },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  // Nothing readable was free — fall back to something guaranteed unique.
  return `${base}-${alumniId.slice(-6)}`;
}

export interface SpotlightInput {
  headline?: string | null;
  summary?: string | null;
  story?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  quote?: string | null;
  displayOrder?: number;
  showOnHomepage?: boolean;
  published?: boolean;
}

/**
 * Creates or updates an alumnus's spotlight, and makes their profile public
 * so the spotlight has somewhere to point. Publishing the spotlight is what
 * puts them on the public page; saving it unpublished is a draft.
 */
export async function upsertAlumniSpotlight(params: {
  alumniId: string;
  adminId: string;
  data: SpotlightInput;
}): Promise<void> {
  const { alumniId, adminId, data } = params;

  const alumni = await db.alumniProfile.findUniqueOrThrow({
    where: { id: alumniId },
    select: { id: true, fullName: true, email: true, graduationYear: true, publicSlug: true, publicProfile: true },
  });
  const existingSpotlight = await db.alumniSpotlight.findUnique({ where: { alumniId }, select: { published: true } });

  const publicSlug =
    alumni.publicSlug ?? (await mintPublicSlug(alumni.fullName, alumni.graduationYear, alumni.id));

  await db.$transaction([
    db.alumniProfile.update({
      where: { id: alumniId },
      // Featuring someone necessarily makes them public: a spotlight links
      // to a profile page, and that page only renders for a public profile.
      data: { publicProfile: true, publicSlug },
    }),
    db.alumniSpotlight.upsert({
      where: { alumniId },
      create: { alumniId, ...data },
      update: data,
    }),
    db.auditLog.create({
      data: {
        adminId,
        action: "UPSERT_ALUMNI_SPOTLIGHT",
        entityType: "AlumniProfile",
        entityId: alumniId,
        newValue: { ...data, publicSlug },
      },
    }),
  ]);

  // Saving a draft changes nothing the person can see, unless it was also
  // what made their profile public.
  const changes: AlumniVisibilityChange[] = [];
  if (!alumni.publicProfile) changes.push("made-public");
  const wasFeatured = existingSpotlight?.published === true;
  if (data.published === true && !wasFeatured) changes.push("featured");
  if (data.published === false && wasFeatured) changes.push("unfeatured");
  await notifyAlumniVisibilityChange({ alumni: { ...alumni, publicSlug }, changes });
}

/**
 * Removes the spotlight. Leaves the profile public — an admin who wants the
 * person off the public site entirely uses setAlumniPublicProfile(false),
 * which is a separate and more consequential decision.
 */
export async function removeAlumniSpotlight(params: { alumniId: string; adminId: string }): Promise<void> {
  const { alumniId, adminId } = params;
  const existing = await db.alumniSpotlight.findUnique({
    where: { alumniId },
    select: { published: true, alumni: { select: { id: true, email: true, fullName: true, publicSlug: true } } },
  });
  await db.$transaction([
    db.alumniSpotlight.deleteMany({ where: { alumniId } }),
    db.auditLog.create({
      data: {
        adminId,
        action: "REMOVE_ALUMNI_SPOTLIGHT",
        entityType: "AlumniProfile",
        entityId: alumniId,
      },
    }),
  ]);

  if (existing?.published) {
    await notifyAlumniVisibilityChange({ alumni: existing.alumni, changes: ["unfeatured"] });
  }
}

/**
 * Turns public visibility on or off. Turning it off also unpublishes any
 * spotlight, so "remove from the public site" cannot leave a published
 * spotlight pointing at a profile that no longer renders.
 */
export async function setAlumniPublicProfile(params: {
  alumniId: string;
  adminId: string;
  isPublic: boolean;
}): Promise<void> {
  const { alumniId, adminId, isPublic } = params;

  const alumni = await db.alumniProfile.findUniqueOrThrow({
    where: { id: alumniId },
    select: {
      id: true,
      email: true,
      fullName: true,
      graduationYear: true,
      publicSlug: true,
      publicProfile: true,
      spotlight: { select: { published: true } },
    },
  });

  const publicSlug = isPublic
    ? (alumni.publicSlug ?? (await mintPublicSlug(alumni.fullName, alumni.graduationYear, alumniId)))
    : alumni.publicSlug;

  await db.$transaction([
    db.alumniProfile.update({
      where: { id: alumniId },
      data: { publicProfile: isPublic, publicSlug },
    }),
    ...(isPublic ? [] : [db.alumniSpotlight.updateMany({ where: { alumniId }, data: { published: false } })]),
    db.auditLog.create({
      data: {
        adminId,
        action: isPublic ? "PUBLISH_ALUMNI_PROFILE" : "UNPUBLISH_ALUMNI_PROFILE",
        entityType: "AlumniProfile",
        entityId: alumniId,
        previousValue: { publicProfile: alumni.publicProfile },
        newValue: { publicProfile: isPublic },
      },
    }),
  ]);

  const changes: AlumniVisibilityChange[] = [];
  if (isPublic && !alumni.publicProfile) changes.push("made-public");
  if (!isPublic && alumni.publicProfile) {
    changes.push("made-private");
    if (alumni.spotlight?.published) changes.push("unfeatured");
  }
  await notifyAlumniVisibilityChange({ alumni: { ...alumni, publicSlug }, changes });
}

/** Professional/public detail an admin can fill in on an alumnus's behalf. */
export async function updateAlumniPublicDetails(params: {
  alumniId: string;
  adminId: string;
  data: {
    currentPosition?: string | null;
    currentOrganization?: string | null;
    industry?: string | null;
    country?: string | null;
    currentLocation?: string | null;
    achievements?: string[];
    linkedinUrl?: string | null;
    twitterUrl?: string | null;
    facebookUrl?: string | null;
    instagramUrl?: string | null;
    websiteUrl?: string | null;
  };
}): Promise<void> {
  const { alumniId, adminId, data } = params;
  await db.$transaction([
    db.alumniProfile.update({ where: { id: alumniId }, data }),
    db.auditLog.create({
      data: {
        adminId,
        action: "UPDATE_ALUMNI_PUBLIC_DETAILS",
        entityType: "AlumniProfile",
        entityId: alumniId,
        newValue: data,
      },
    }),
  ]);
}

/** Everything the admin spotlight editor needs for one alumnus. */
export async function getAlumniForSpotlightEditor(alumniId: string) {
  return db.alumniProfile.findUnique({
    where: { id: alumniId },
    include: { spotlight: true },
  });
}

/** Counts for the admin alumni overview. */
export async function getAlumniShowcaseCounts() {
  const [total, active, publicProfiles, featured] = await Promise.all([
    db.alumniProfile.count(),
    db.alumniProfile.count({ where: { status: "ACTIVE" } }),
    db.alumniProfile.count({ where: { publicProfile: true, status: "ACTIVE" } }),
    db.alumniProfile.count({
      where: { publicProfile: true, status: "ACTIVE", spotlight: { published: true } },
    }),
  ]);
  return { total, active, publicProfiles, featured };
}
