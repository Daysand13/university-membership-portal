import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { SiteSettingsInput } from "@/lib/validations/content";
import type { SocialPlatform, TeamMemberType } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

export async function getAboutContent() {
  return db.aboutContent.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export async function updateAboutContent(data: {
  mission?: string;
  vision?: string;
  coreValues?: string;
  history?: string;
  objectives?: string;
  leadershipMessage?: string;
  membershipEligibility?: string;
  partnersStakeholders?: string;
  imageUrl?: string | null;
}) {
  return db.aboutContent.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
}

// ---------------------------------------------------------------------------
// Team Members (Executive Leadership + Our Patrons)
// ---------------------------------------------------------------------------

export async function getActiveTeamMembers(type: TeamMemberType) {
  return db.teamMember.findMany({
    where: { type, isActive: true },
    orderBy: { order: "asc" },
  });
}

export async function listTeamMembersForAdmin(type: TeamMemberType) {
  return db.teamMember.findMany({
    where: { type },
    orderBy: { order: "asc" },
    include: {
      member: { select: { firstName: true, middleName: true, lastName: true, indexNumber: true } },
    },
  });
}

export async function getTeamMemberById(id: string) {
  return db.teamMember.findUnique({ where: { id } });
}

/** A member account can only be linked to one Leadership listing — thrown
 *  as a plain Error so the action layer can show it as a normal form
 *  message rather than a raw database constraint failure. */
async function assertMemberNotAlreadyLinked(memberId: string, excludeTeamMemberId?: string): Promise<void> {
  const existing = await db.teamMember.findUnique({ where: { memberId }, select: { id: true, name: true } });
  if (existing && existing.id !== excludeTeamMemberId) {
    throw new Error(`That member account is already linked to ${existing.name}'s listing.`);
  }
}

export async function createTeamMember(data: {
  type: TeamMemberType;
  name: string;
  position: string;
  photoUrl?: string;
  bio?: string;
  order?: number;
  isActive?: boolean;
  memberId?: string | null;
}) {
  if (data.memberId) await assertMemberNotAlreadyLinked(data.memberId);
  return db.teamMember.create({ data });
}

export async function updateTeamMember(
  id: string,
  data: Partial<{
    name: string;
    position: string;
    photoUrl: string | null;
    bio: string | null;
    order: number;
    isActive: boolean;
    memberId: string | null;
  }>,
) {
  if (data.memberId) await assertMemberNotAlreadyLinked(data.memberId, id);
  return db.teamMember.update({ where: { id }, data });
}

export async function deleteTeamMember(id: string) {
  return db.teamMember.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Donate
// ---------------------------------------------------------------------------

export async function getDonateContent() {
  return db.donateContent.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export async function updateDonateContent(data: {
  title?: string;
  description?: string;
  instructions?: string;
  bankDetails?: string;
  mobileMoneyDetails?: string;
  paymentGatewayUrl?: string;
  qrCodeImageUrl?: string | null;
  contactInfo?: string;
  bannerImageUrl?: string | null;
}) {
  return db.donateContent.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
}

// ---------------------------------------------------------------------------
// Hero slides
// ---------------------------------------------------------------------------

export async function getActiveHeroSlides() {
  return db.heroSlide.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
}

export async function listHeroSlidesForAdmin() {
  return db.heroSlide.findMany({ orderBy: { order: "asc" } });
}

export async function createHeroSlide(data: {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  backgroundColor?: string;
  ctaText?: string;
  ctaUrl?: string;
  order?: number;
  isActive?: boolean;
}) {
  return db.heroSlide.create({ data });
}

export async function updateHeroSlide(
  id: string,
  data: Partial<{
    title: string;
    subtitle: string | null;
    imageUrl: string | null;
    backgroundColor: string | null;
    ctaText: string | null;
    ctaUrl: string | null;
    order: number;
    isActive: boolean;
  }>,
) {
  return db.heroSlide.update({ where: { id }, data });
}

export async function deleteHeroSlide(id: string) {
  return db.heroSlide.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Site settings (single JSON blob under a well-known key)
// ---------------------------------------------------------------------------

const SETTINGS_KEY = "general";

export const DEFAULT_SITE_SETTINGS: SiteSettingsInput = {
  siteTitle: "Acme University Students' Association",
  footerDescription:
    "The official membership and information portal of the Acme University Students' Association.",
  logoUrl: null,
  faviconUrl: null,
  universityLogoUrl: null,
  copyrightText: `© ${new Date().getFullYear()} Acme University Students' Association. All rights reserved.`,
  generalEmail: "",
  membershipEmail: "",
  adminEmail: "",
  phonePrimary: "",
  phoneSecondary: "",
  physicalAddress: "",
  postalAddress: "",
  officeHours: "",
  mapEmbedUrl: "",
};

/**
 * Site branding, read during render by the root layout's metadata, the
 * Header, the Footer, and several pages — i.e. several times per page
 * load, on every single request.
 *
 * Two protections, both deliberate:
 *
 * 1. `cache()` deduplicates it to ONE query per request instead of three
 *    or four identical ones, cutting database load on every page view.
 *
 * 2. A failure returns the built-in defaults rather than throwing. This
 *    matters a lot: because the root layout calls this, an unhandled
 *    failure here would take down EVERY page of the site with the generic
 *    "we hit an unexpected error loading this page" boundary — not just
 *    one feature. Degrading to default branding keeps the whole site
 *    usable through a brief database problem.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettingsInput> => {
  try {
    const record = await db.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!record) return DEFAULT_SITE_SETTINGS;
    return { ...DEFAULT_SITE_SETTINGS, ...(record.value as Partial<SiteSettingsInput>) };
  } catch (err) {
    console.error("[content] failed to load site settings — falling back to defaults:", err);
    return DEFAULT_SITE_SETTINGS;
  }
});

/** The subset of Site Settings the email templates need, so template call
 * sites don't have to know the full settings shape. */
export async function getEmailBrand(): Promise<{
  siteTitle: string;
  logoUrl: string | null | undefined;
  universityLogoUrl: string | null | undefined;
}> {
  const settings = await getSiteSettings();
  return {
    siteTitle: settings.siteTitle,
    logoUrl: settings.logoUrl,
    universityLogoUrl: settings.universityLogoUrl,
  };
}

export async function updateSiteSettings(data: SiteSettingsInput): Promise<SiteSettingsInput> {
  await db.siteSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: data },
    create: { key: SETTINGS_KEY, value: data },
  });
  return data;
}

// ---------------------------------------------------------------------------
// Social links
// ---------------------------------------------------------------------------

export async function getActiveSocialLinks() {
  return db.socialLink.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
}

export async function listSocialLinksForAdmin() {
  return db.socialLink.findMany({ orderBy: { order: "asc" } });
}

export async function upsertSocialLink(data: {
  id?: string;
  platform: SocialPlatform;
  displayName: string;
  url: string;
  isActive: boolean;
  order: number;
}) {
  const { id, ...rest } = data;
  if (id) {
    return db.socialLink.update({ where: { id }, data: rest });
  }
  return db.socialLink.create({ data: rest });
}

export async function deleteSocialLink(id: string) {
  return db.socialLink.delete({ where: { id } });
}
