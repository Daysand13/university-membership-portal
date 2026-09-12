import { z } from "zod";
import { ContentStatus } from "@/generated/prisma/enums";
import { extractMapUrl } from "@/lib/maps-url";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export { slugify };

/**
 * Length ceilings for text an administrator types. They're a guard against
 * a runaway paste, not an editorial limit: every one of these columns is an
 * unbounded `text` column in Postgres. The earlier values — a 200-character
 * event title, a 400-character excerpt, a 4,000-character mission statement
 * — were cutting admins off mid-sentence on perfectly ordinary content.
 */
const SHORT_TEXT = 500; // titles, names, positions, venues
const MEDIUM_TEXT = 5_000; // excerpts, short descriptions, addresses, contact details
const LONG_TEXT = 100_000; // page sections, bios, descriptions, results

export const newsSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Title is required").max(SHORT_TEXT),
  slug: z
    .string()
    .trim()
    .max(SHORT_TEXT)
    .optional()
    .transform((v) => (v ? slugify(v) : undefined)),
  excerpt: z.string().trim().min(10, "A short summary is required").max(MEDIUM_TEXT),
  body: z.string().trim().min(20, "Article body is required"),
  coverImageKey: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string().trim().max(100)).max(30).default([]),
  status: z.enum(ContentStatus).default(ContentStatus.DRAFT),
  featured: z.boolean().default(false),
});
export type NewsInput = z.infer<typeof newsSchema>;

export const eventSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(3, "Title is required").max(SHORT_TEXT),
    slug: z
      .string()
      .trim()
      .max(SHORT_TEXT)
      .optional()
      .transform((v) => (v ? slugify(v) : undefined)),
    description: z.string().trim().min(10, "Description is required"),
    shortDescription: z.string().trim().max(MEDIUM_TEXT).optional().or(z.literal("")),
    imageKey: z.string().optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    startTime: z.string().trim().max(50).optional().or(z.literal("")),
    endTime: z.string().trim().max(50).optional().or(z.literal("")),
    venue: z.string().trim().min(1, "Venue is required").max(SHORT_TEXT),
    organizer: z.string().trim().max(SHORT_TEXT).optional().or(z.literal("")),
    contactInfo: z.string().trim().max(MEDIUM_TEXT).optional().or(z.literal("")),
    registrationLink: z.string().trim().url().optional().or(z.literal("")),
    externalLink: z.string().trim().url().optional().or(z.literal("")),
    categoryId: z.string().optional().nullable(),
    status: z.enum(ContentStatus).default(ContentStatus.DRAFT),
    featured: z.boolean().default(false),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });
export type EventInput = z.infer<typeof eventSchema>;

export const documentSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Title is required").max(SHORT_TEXT),
  description: z.string().trim().max(LONG_TEXT).optional().or(z.literal("")),
  categoryId: z.string().optional().nullable(),
  version: z.string().trim().max(100).optional().or(z.literal("")),
  status: z.enum(ContentStatus).default(ContentStatus.DRAFT),
  featured: z.boolean().default(false),
  isPublic: z.boolean().default(true),
});
export type DocumentInput = z.infer<typeof documentSchema>;

// Public contact form — typed by visitors, not administrators, so its limits
// stay where they were.
export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Subject is required").max(200),
  message: z.string().trim().min(10, "Message is required").max(4000),
});
export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const adminChangeEmailSchema = z.object({
  currentPassword: z.string().trim().min(1, "Current password is required"),
  newEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const adminUpdateNameSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(SHORT_TEXT),
});

export const aboutContentSchema = z.object({
  mission: z.string().max(LONG_TEXT).optional().or(z.literal("")),
  vision: z.string().max(LONG_TEXT).optional().or(z.literal("")),
  coreValues: z.string().max(LONG_TEXT).optional().or(z.literal("")),
  history: z.string().max(LONG_TEXT).optional().or(z.literal("")),
  objectives: z.string().max(LONG_TEXT).optional().or(z.literal("")),
  leadershipMessage: z.string().max(LONG_TEXT).optional().or(z.literal("")),
  membershipEligibility: z.string().max(LONG_TEXT).optional().or(z.literal("")),
  partnersStakeholders: z.string().max(LONG_TEXT).optional().or(z.literal("")),
  imageKey: z.string().optional().nullable(),
});

export const teamMemberSchema = z.object({
  type: z.enum(["LEADERSHIP", "PATRON"]),
  name: z.string().trim().min(1, "Name is required").max(SHORT_TEXT),
  position: z.string().trim().min(1, "Position is required").max(SHORT_TEXT),
  bio: z.string().max(LONG_TEXT).optional().or(z.literal("")),
  order: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
});

export const donateContentSchema = z.object({
  title: z.string().max(SHORT_TEXT).optional().or(z.literal("")),
  description: z.string().max(LONG_TEXT).optional().or(z.literal("")),
  instructions: z.string().max(LONG_TEXT).optional().or(z.literal("")),
  bankDetails: z.string().max(MEDIUM_TEXT).optional().or(z.literal("")),
  mobileMoneyDetails: z.string().max(MEDIUM_TEXT).optional().or(z.literal("")),
  paymentGatewayUrl: z.string().url().optional().or(z.literal("")),
  qrCodeImageKey: z.string().optional().nullable(),
  contactInfo: z.string().max(MEDIUM_TEXT).optional().or(z.literal("")),
  bannerImageKey: z.string().optional().nullable(),
});

export const electionSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Title is required").max(SHORT_TEXT),
  description: z.string().trim().max(LONG_TEXT).optional().or(z.literal("")),
  status: z.enum(ContentStatus).default(ContentStatus.DRAFT),
  nominationStart: z.coerce.date().optional(),
  nominationEnd: z.coerce.date().optional(),
  votingDate: z.coerce.date().optional(),
  venueOrMethod: z.string().trim().max(SHORT_TEXT).optional().or(z.literal("")),
  resultsSummary: z.string().trim().max(LONG_TEXT).optional().or(z.literal("")),
});
export type ElectionInput = z.infer<typeof electionSchema>;

export const socialLinkSchema = z.object({
  id: z.string().optional(),
  platform: z.enum([
    "FACEBOOK",
    "INSTAGRAM",
    "TWITTER",
    "TIKTOK",
    "YOUTUBE",
    "LINKEDIN",
    "WHATSAPP",
    "TELEGRAM",
    "CUSTOM",
  ]),
  displayName: z.string().trim().min(1).max(SHORT_TEXT),
  url: z.string().trim().url("Enter a valid URL"),
  isActive: z.boolean().default(true),
  order: z.coerce.number().int().default(0),
});

export const siteSettingsSchema = z.object({
  siteTitle: z.string().trim().min(1).max(SHORT_TEXT),
  footerDescription: z.string().trim().max(MEDIUM_TEXT).optional().or(z.literal("")),
  logoUrl: z.string().optional().nullable(),
  faviconUrl: z.string().optional().nullable(),
  // The university's own crest, shown alongside the association's mark on
  // exported PDFs. Separate from logoUrl: that one is the association's.
  universityLogoUrl: z.string().optional().nullable(),
  copyrightText: z.string().trim().max(SHORT_TEXT).optional().or(z.literal("")),
  generalEmail: z.string().trim().email().optional().or(z.literal("")),
  membershipEmail: z.string().trim().email().optional().or(z.literal("")),
  adminEmail: z.string().trim().email().optional().or(z.literal("")),
  phonePrimary: z.string().trim().max(100).optional().or(z.literal("")),
  phoneSecondary: z.string().trim().max(100).optional().or(z.literal("")),
  physicalAddress: z.string().trim().max(MEDIUM_TEXT).optional().or(z.literal("")),
  postalAddress: z.string().trim().max(MEDIUM_TEXT).optional().or(z.literal("")),
  officeHours: z.string().trim().max(MEDIUM_TEXT).optional().or(z.literal("")),
  // Accepts a pasted <iframe> snippet as well as a URL, keeping just its src.
  mapEmbedUrl: z.preprocess(
    (value) => (typeof value === "string" ? extractMapUrl(value) : value),
    z.string().trim().url("Paste a Google Maps link, for example https://maps.app.goo.gl/…").optional().or(z.literal("")),
  ),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
