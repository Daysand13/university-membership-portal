import { z } from "zod";
import { ContentStatus } from "@/generated/prisma/client";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export { slugify };

export const newsSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .max(150)
    .optional()
    .transform((v) => (v ? slugify(v) : undefined)),
  excerpt: z.string().trim().min(10, "A short summary is required").max(400),
  body: z.string().trim().min(20, "Article body is required"),
  coverImageKey: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string().trim().max(40)).max(10).default([]),
  status: z.enum(ContentStatus).default(ContentStatus.DRAFT),
  featured: z.boolean().default(false),
});
export type NewsInput = z.infer<typeof newsSchema>;

export const eventSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(3, "Title is required").max(200),
    slug: z
      .string()
      .trim()
      .max(150)
      .optional()
      .transform((v) => (v ? slugify(v) : undefined)),
    description: z.string().trim().min(10, "Description is required"),
    shortDescription: z.string().trim().max(300).optional().or(z.literal("")),
    imageKey: z.string().optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    startTime: z.string().trim().max(20).optional().or(z.literal("")),
    endTime: z.string().trim().max(20).optional().or(z.literal("")),
    venue: z.string().trim().min(1, "Venue is required").max(200),
    organizer: z.string().trim().max(150).optional().or(z.literal("")),
    contactInfo: z.string().trim().max(200).optional().or(z.literal("")),
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
  title: z.string().trim().min(2, "Title is required").max(200),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  categoryId: z.string().optional().nullable(),
  version: z.string().trim().max(30).optional().or(z.literal("")),
  status: z.enum(ContentStatus).default(ContentStatus.DRAFT),
  featured: z.boolean().default(false),
  isPublic: z.boolean().default(true),
});
export type DocumentInput = z.infer<typeof documentSchema>;

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
  name: z.string().trim().min(2, "Name is required").max(150),
});

export const aboutContentSchema = z.object({
  mission: z.string().max(4000).optional().or(z.literal("")),
  vision: z.string().max(4000).optional().or(z.literal("")),
  coreValues: z.string().max(4000).optional().or(z.literal("")),
  history: z.string().max(8000).optional().or(z.literal("")),
  objectives: z.string().max(4000).optional().or(z.literal("")),
  leadershipMessage: z.string().max(4000).optional().or(z.literal("")),
  imageKey: z.string().optional().nullable(),
});

export const donateContentSchema = z.object({
  title: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(4000).optional().or(z.literal("")),
  instructions: z.string().max(4000).optional().or(z.literal("")),
  bankDetails: z.string().max(2000).optional().or(z.literal("")),
  mobileMoneyDetails: z.string().max(2000).optional().or(z.literal("")),
  paymentGatewayUrl: z.string().url().optional().or(z.literal("")),
  qrCodeImageKey: z.string().optional().nullable(),
  contactInfo: z.string().max(500).optional().or(z.literal("")),
  bannerImageKey: z.string().optional().nullable(),
});

export const electionSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Title is required").max(200),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  status: z.enum(ContentStatus).default(ContentStatus.DRAFT),
  nominationStart: z.coerce.date().optional(),
  nominationEnd: z.coerce.date().optional(),
  votingDate: z.coerce.date().optional(),
  venueOrMethod: z.string().trim().max(200).optional().or(z.literal("")),
  resultsSummary: z.string().trim().max(4000).optional().or(z.literal("")),
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
  displayName: z.string().trim().min(1).max(60),
  url: z.string().trim().url("Enter a valid URL"),
  isActive: z.boolean().default(true),
  order: z.coerce.number().int().default(0),
});

export const siteSettingsSchema = z.object({
  siteTitle: z.string().trim().min(1).max(150),
  footerDescription: z.string().trim().max(500).optional().or(z.literal("")),
  logoUrl: z.string().optional().nullable(),
  faviconUrl: z.string().optional().nullable(),
  copyrightText: z.string().trim().max(200).optional().or(z.literal("")),
  generalEmail: z.string().trim().email().optional().or(z.literal("")),
  membershipEmail: z.string().trim().email().optional().or(z.literal("")),
  adminEmail: z.string().trim().email().optional().or(z.literal("")),
  phonePrimary: z.string().trim().max(30).optional().or(z.literal("")),
  phoneSecondary: z.string().trim().max(30).optional().or(z.literal("")),
  physicalAddress: z.string().trim().max(300).optional().or(z.literal("")),
  postalAddress: z.string().trim().max(300).optional().or(z.literal("")),
  officeHours: z.string().trim().max(200).optional().or(z.literal("")),
  mapEmbedUrl: z.string().trim().url().optional().or(z.literal("")),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
