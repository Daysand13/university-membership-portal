import "server-only";
import { db } from "@/lib/db";
import type { SiteSettingsInput } from "@/lib/validations/content";
import type { SocialPlatform } from "@/generated/prisma/client";

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
  imageUrl?: string | null;
}) {
  return db.aboutContent.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
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

export async function getSiteSettings(): Promise<SiteSettingsInput> {
  const record = await db.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!record) return DEFAULT_SITE_SETTINGS;
  return { ...DEFAULT_SITE_SETTINGS, ...(record.value as Partial<SiteSettingsInput>) };
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
