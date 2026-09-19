import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { AdminUser, AllyType } from "@/generated/prisma/client";
import { deliver, firstNameOf } from "@/lib/services/account-notification-service";
import { notifyAdminsOfAllySignup } from "@/lib/services/outreach-notification-service";
import { ON_THE_ROLL } from "@/lib/services/membership-roll";
import { DEFAULT_ALLIES_PAGE_SETTINGS, type AlliesPageSettings } from "@/lib/outreach-options";

/**
 * Allies & Champions: the named supporters an administrator puts on the
 * public page, and the people who join the ally network from it.
 *
 * Joining needs no account — just a name and an email address — so the one
 * thing standing between a stranger's form and somebody's inbox is the
 * confirmation link. Nothing is ever sent to an address, broadcasts
 * included, until its owner has clicked it.
 */

const SETTINGS_KEY = "allies-page";

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

function siteUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ?? ""}${path}`;
}

// ---------------------------------------------------------------------------
// The public page
// ---------------------------------------------------------------------------

export async function listPublicAllies() {
  return db.ally.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export interface AlliesStats {
  corporateAllies: number;
  individualChampions: number;
  campaignsSupported: number;
  advocacyReach: number;
}

/**
 * The four numbers across the top of the page. Allies are counted once
 * each: a public listing, plus anyone who confirmed their sign-up and isn't
 * already that listing. "Advocacy reach" is the number of people who hear
 * from the association about its campaigns — students, graduates, patrons
 * and confirmed allies — not a marketing estimate.
 */
export async function getAlliesStats(): Promise<AlliesStats> {
  const confirmedUnlisted = { confirmedAt: { not: null }, unsubscribedAt: null, ally: { is: null } };
  const [
    corporateListed,
    corporateSignups,
    individualListed,
    individualSignups,
    campaignsSupported,
    students,
    alumni,
    patrons,
    subscribedAllies,
  ] = await Promise.all([
    db.ally.count({ where: { type: "CORPORATE", isActive: true } }),
    db.allySignup.count({ where: { type: "CORPORATE", ...confirmedUnlisted } }),
    db.ally.count({ where: { type: "INDIVIDUAL", isActive: true } }),
    db.allySignup.count({ where: { type: "INDIVIDUAL", ...confirmedUnlisted } }),
    db.advocacyCampaign.count({ where: { status: { in: ["ACTIVE", "ACHIEVED"] } } }),
    db.member.count({ where: { status: "ACTIVE", ...ON_THE_ROLL } }),
    db.alumniProfile.count({ where: { status: "ACTIVE" } }),
    db.patronProfile.count({ where: { status: "APPROVED" } }),
    db.allySignup.count({ where: { confirmedAt: { not: null }, unsubscribedAt: null } }),
  ]);

  return {
    corporateAllies: corporateListed + corporateSignups,
    individualChampions: individualListed + individualSignups,
    campaignsSupported,
    advocacyReach: students + alumni + patrons + subscribedAllies,
  };
}

export async function getAlliesPageSettings(): Promise<AlliesPageSettings> {
  try {
    const record = await db.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
    return { ...DEFAULT_ALLIES_PAGE_SETTINGS, ...((record?.value as Partial<AlliesPageSettings>) ?? {}) };
  } catch (err) {
    console.error("[allies] could not load the page settings — using defaults", err);
    return DEFAULT_ALLIES_PAGE_SETTINGS;
  }
}

export async function updateAlliesPageSettings(settings: AlliesPageSettings, adminId: string) {
  await db.siteSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: { ...settings } },
    create: { key: SETTINGS_KEY, value: { ...settings } },
  });
  await db.auditLog.create({
    data: { adminId, action: "UPDATE_ALLIES_SETTINGS", entityType: "SiteSetting", entityId: SETTINGS_KEY, newValue: { ...settings } },
  });
}

// ---------------------------------------------------------------------------
// Joining the network
// ---------------------------------------------------------------------------

export type AllySignupOutcome = "sent-confirmation" | "already-confirmed";

/**
 * Records a sign-up and emails the confirmation link. Signing up again with
 * the same address updates the details and re-sends the link — someone who
 * lost the first email shouldn't be stuck — but never changes a confirmed
 * address back to unconfirmed, and never reveals to the form whether the
 * address was already on the list.
 */
export async function registerAlly(input: {
  fullName: string;
  email: string;
  type: AllyType;
  organization: string | null;
  wantsListing: boolean;
}): Promise<AllySignupOutcome> {
  const existing = await db.allySignup.findUnique({ where: { email: input.email } });

  if (existing && existing.confirmedAt && !existing.unsubscribedAt) {
    await db.allySignup.update({
      where: { id: existing.id },
      data: {
        fullName: input.fullName,
        type: input.type,
        organization: input.organization,
        wantsListing: existing.wantsListing || input.wantsListing,
      },
    });
    return "already-confirmed";
  }

  const signup = existing
    ? await db.allySignup.update({
        where: { id: existing.id },
        data: {
          fullName: input.fullName,
          type: input.type,
          organization: input.organization,
          wantsListing: input.wantsListing,
          // Coming back after unsubscribing starts again from unconfirmed.
          confirmedAt: null,
          unsubscribedAt: null,
          token: newToken(),
        },
      })
    : await db.allySignup.create({ data: { ...input, token: newToken() } });

  await deliver({
    to: { email: signup.email, firstName: firstNameOf(signup.fullName) },
    template: "ally-confirm",
    entityType: "AllySignup",
    entityId: signup.id,
    build: (brand) => ({
      subject: `Confirm you'd like to join the ${brand.siteTitle} ally network`,
      paragraphs: [
        `Thank you for standing with students with special needs at the ${brand.siteTitle}.`,
        "Please confirm this is your email address. Until you do, we won't send you anything else.",
      ],
      closingParagraphs: [
        "If you didn't sign up, ignore this email — you won't hear from us again.",
      ],
      cta: { path: `/allies/confirm/${signup.token}`, label: "Confirm My Email" },
    }),
  });
  return "sent-confirmation";
}

export async function findSignupByToken(token: string) {
  if (!token || token.length > 100) return null;
  return db.allySignup.findUnique({ where: { token } });
}

/** Confirms an address. The admins hear about it only once it's real. */
export async function confirmAllySignup(token: string) {
  const signup = await findSignupByToken(token);
  if (!signup) return null;
  if (signup.confirmedAt && !signup.unsubscribedAt) return signup;
  const confirmed = await db.allySignup.update({
    where: { id: signup.id },
    data: { confirmedAt: new Date(), unsubscribedAt: null },
  });
  await notifyAdminsOfAllySignup(confirmed);
  return confirmed;
}

export async function unsubscribeAlly(token: string) {
  const signup = await findSignupByToken(token);
  if (!signup) return null;
  if (signup.unsubscribedAt) return signup;
  return db.allySignup.update({ where: { id: signup.id }, data: { unsubscribedAt: new Date() } });
}

/** The unsubscribe link every email to an ally carries. */
export function allyUnsubscribeUrl(token: string): string {
  return siteUrl(`/allies/unsubscribe/${token}`);
}

/** Who a broadcast to "Allies" reaches: confirmed and still subscribed. */
export async function listAllyRecipients() {
  const allies = await db.allySignup.findMany({
    where: { confirmedAt: { not: null }, unsubscribedAt: null },
    select: { email: true, fullName: true, token: true },
  });
  return allies.map((a) => ({
    email: a.email,
    firstName: firstNameOf(a.fullName),
    unsubscribeUrl: allyUnsubscribeUrl(a.token),
  }));
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export interface AllyListingFields {
  type: AllyType;
  name: string;
  imageUrl: string | null;
  role: string | null;
  organization: string | null;
  sector: string | null;
  statement: string | null;
  spotlightQuote: string | null;
  featured: boolean;
  websiteUrl: string | null;
  order: number;
  isActive: boolean;
}

export async function listAlliesForAdmin() {
  return db.ally.findMany({ orderBy: [{ type: "asc" }, { order: "asc" }, { createdAt: "asc" }] });
}

export async function getAllyForAdmin(id: string) {
  return db.ally.findUnique({ where: { id }, include: { signup: true } });
}

export async function createAlly(params: {
  fields: AllyListingFields;
  signupId: string | null;
  admin: Pick<AdminUser, "id">;
}) {
  const { fields, signupId, admin } = params;
  const ally = await db.ally.create({ data: { ...fields, signupId } });
  if (signupId) {
    await db.allySignup.update({ where: { id: signupId }, data: { status: "LISTED" } });
  }
  await db.auditLog.create({
    data: { adminId: admin.id, action: "CREATE_ALLY", entityType: "Ally", entityId: ally.id, newValue: { name: ally.name } },
  });
  return ally;
}

export async function updateAlly(params: { id: string; fields: AllyListingFields; admin: Pick<AdminUser, "id"> }) {
  const ally = await db.ally.update({ where: { id: params.id }, data: params.fields });
  await db.auditLog.create({
    data: {
      adminId: params.admin.id,
      action: "UPDATE_ALLY",
      entityType: "Ally",
      entityId: ally.id,
      newValue: { name: ally.name, isActive: ally.isActive, featured: ally.featured },
    },
  });
  return ally;
}

export async function deleteAlly(params: { id: string; admin: Pick<AdminUser, "id"> }) {
  const ally = await db.ally.delete({ where: { id: params.id } });
  if (ally.signupId) {
    await db.allySignup.updateMany({ where: { id: ally.signupId, status: "LISTED" }, data: { status: "REVIEWED" } });
  }
  await db.auditLog.create({
    data: { adminId: params.admin.id, action: "DELETE_ALLY", entityType: "Ally", entityId: ally.id, previousValue: { name: ally.name } },
  });
}

export async function listAllySignups(filter: "listing" | "all" = "all") {
  return db.allySignup.findMany({
    where: filter === "listing" ? { wantsListing: true, status: { not: "LISTED" } } : {},
    orderBy: { createdAt: "desc" },
    include: { ally: { select: { id: true } } },
    take: 500,
  });
}

export async function getAllySignup(id: string) {
  return db.allySignup.findUnique({ where: { id } });
}

export async function markAllySignupReviewed(id: string) {
  await db.allySignup.updateMany({ where: { id, status: "NEW" }, data: { status: "REVIEWED" } });
}

export async function countAllySignups() {
  const [total, confirmed, awaitingListing] = await Promise.all([
    db.allySignup.count(),
    db.allySignup.count({ where: { confirmedAt: { not: null }, unsubscribedAt: null } }),
    db.allySignup.count({ where: { wantsListing: true, confirmedAt: { not: null }, status: { not: "LISTED" } } }),
  ]);
  return { total, confirmed, awaitingListing };
}
