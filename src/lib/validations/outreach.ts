import { z } from "zod";
import { DONATION_FUND_VALUES, MAX_DONATION_CEDIS, MIN_DONATION_CEDIS } from "@/lib/patron-portal-options";
import {
  ALLY_TYPE_VALUES,
  PRIOR_QUALIFICATIONS,
  REQUEST_OPERATING_SYSTEMS,
  TECH_REQUEST_KIND_VALUES,
  TUTORIAL_SOURCE_VALUES,
  SOFTWARE_CATEGORY_VALUES,
  SOFTWARE_PLATFORM_VALUES,
} from "@/lib/outreach-options";

/**
 * What the public outreach pages and their admin screens accept: joining the
 * ally network, giving without an account, asking for a piece of software,
 * and the listings administrators write for both pages. Plus an alumnus's
 * earlier programmes.
 */

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), "Enter a full web address, starting with https://")
  .optional()
  .or(z.literal(""));

// --- Public forms ---------------------------------------------------------------

export const allySignupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(150),
  email,
  type: z.enum(ALLY_TYPE_VALUES, { message: "Choose how you're joining" }),
  organization: optionalText(200),
  wantsListing: z.boolean(),
});
export type AllySignupInput = z.infer<typeof allySignupSchema>;

/** A gift from someone without an account. */
export const publicDonationSchema = z.object({
  donorName: z.string().trim().min(2, "Enter your name").max(150),
  donorEmail: email,
  amount: z.preprocess(
    (value) => (typeof value === "string" ? Number(value.replace(/[,\s]/g, "")) : value),
    z
      .number({ message: "Choose or enter an amount" })
      .finite("Choose or enter an amount")
      .min(MIN_DONATION_CEDIS, `The smallest donation is GH₵ ${MIN_DONATION_CEDIS}`)
      .max(MAX_DONATION_CEDIS, "For larger gifts, please contact the association")
      .refine((n) => Math.round(n * 100) === Number((n * 100).toFixed(4)), "Use at most two decimal places"),
  ),
  fund: z.enum(DONATION_FUND_VALUES, { message: "Choose a cause" }),
});
export type PublicDonationInput = z.infer<typeof publicDonationSchema>;

export const techRequestSchema = z
  .object({
    kind: z.enum(TECH_REQUEST_KIND_VALUES, { message: "Choose what you're asking for" }),
    fullName: z.string().trim().min(2, "Enter your full name").max(150),
    email,
    topic: z.string().trim().min(2, "Tell us what you need").max(150),
    category: z.enum(SOFTWARE_CATEGORY_VALUES, { message: "Choose the area it helps with" }),
    /** Only meaningful for software: a tutorial is watched, not installed. */
    operatingSystem: z.enum(REQUEST_OPERATING_SYSTEMS).or(z.literal("")).optional(),
    notes: optionalText(2000),
  })
  .refine((data) => data.kind !== "SOFTWARE" || Boolean(data.operatingSystem), {
    message: "Choose your operating system",
    path: ["operatingSystem"],
  });
export type TechRequestInput = z.infer<typeof techRequestSchema>;

export const tutorialListingSchema = z.object({
  title: z.string().trim().min(3, "Give the tutorial a title").max(200),
  description: z.string().trim().min(10, "Say what it covers").max(600),
  source: z.enum(TUTORIAL_SOURCE_VALUES, { message: "Choose YouTube or TikTok" }),
  url: z
    .string()
    .trim()
    .url("Paste the link to the video")
    .max(1000),
  thumbnailUrl: optionalText(1000),
  category: z.enum(SOFTWARE_CATEGORY_VALUES).or(z.literal("")).optional(),
  durationLabel: optionalText(20),
  order: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean(),
});
export type TutorialListingInput = z.infer<typeof tutorialListingSchema>;

// --- Admin forms ------------------------------------------------------------------

export const allyListingSchema = z
  .object({
    type: z.enum(ALLY_TYPE_VALUES, { message: "Choose individual or organisation" }),
    name: z.string().trim().min(2, "Enter the name").max(200),
    imageUrl: optionalText(1000),
    role: optionalText(200),
    organization: optionalText(200),
    sector: optionalText(200),
    statement: optionalText(400),
    spotlightQuote: optionalText(800),
    featured: z.boolean(),
    websiteUrl: optionalUrl,
    order: z.coerce.number().int().min(0).max(9999).default(0),
    isActive: z.boolean(),
  })
  .refine((data) => !data.featured || (data.spotlightQuote ?? "").trim().length > 0, {
    message: "Add the quote to feature in the spotlight",
    path: ["spotlightQuote"],
  });
export type AllyListingInput = z.infer<typeof allyListingSchema>;

export const alliesSettingsSchema = z.object({
  partnershipEmail: email.or(z.literal("")),
});

export const softwareListingSchema = z.object({
  name: z.string().trim().min(2, "Enter the software's name").max(150),
  logoUrl: optionalText(1000),
  category: z.enum(SOFTWARE_CATEGORY_VALUES, { message: "Choose a category" }),
  platforms: z.array(z.enum(SOFTWARE_PLATFORM_VALUES)).min(1, "Choose at least one platform"),
  description: z.string().trim().min(10, "Describe what it does").max(600),
  isFree: z.boolean(),
  telegramUrl: optionalUrl,
  websiteUrl: optionalUrl,
  order: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean(),
});
export type SoftwareListingInput = z.infer<typeof softwareListingSchema>;

export const assistiveSettingsSchema = z.object({
  telegramUrl: optionalUrl,
  supportEmail: email.or(z.literal("")),
  licenceTierCedis: z.coerce.number().int("Whole cedis, please").min(1).max(MAX_DONATION_CEDIS),
  hardwareTierCedis: z.coerce.number().int("Whole cedis, please").min(1).max(MAX_DONATION_CEDIS),
});

export const softwareRequestUpdateSchema = z
  .object({
    status: z.enum(["NEW", "IN_PROGRESS", "FULFILLED", "DECLINED"], { message: "Choose a status" }),
    adminNote: optionalText(2000),
    notify: z.boolean(),
  })
  .refine((data) => !data.notify || data.status === "NEW" || (data.adminNote ?? "").trim().length > 0, {
    message: "Write a note for the requester, since they'll be emailed",
    path: ["adminNote"],
  });

// --- Alumni's earlier programmes ----------------------------------------------

export const priorProgrammeSchema = z.object({
  qualification: z.enum(PRIOR_QUALIFICATIONS, { message: "Choose the qualification" }),
  programme: z.string().trim().min(2, "Enter the programme").max(200),
  institution: z.string().trim().min(2, "Enter the university or college").max(200),
  yearCompleted: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || (/^\d{4}$/.test(value) && Number(value) >= 1950 && Number(value) <= new Date().getFullYear()),
      "Enter the year as four digits",
    )
    .optional()
    .or(z.literal("")),
});
export type PriorProgrammeInput = z.infer<typeof priorProgrammeSchema>;
