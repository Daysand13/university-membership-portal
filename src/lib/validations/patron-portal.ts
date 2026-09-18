import { z } from "zod";
import {
  BROADCAST_AUDIENCE_VALUES,
  CAMPAIGN_STATUS_VALUES,
  DONATION_FUND_VALUES,
  EXPENSE_CATEGORY_VALUES,
  ISSUE_ACTION_VALUES,
  ISSUE_CATEGORY_VALUES,
  ISSUE_STATUS_VALUES,
  MAX_DONATION_CEDIS,
  MIN_DONATION_CEDIS,
  PATRON_BROADCAST_AUDIENCE_VALUES,
} from "@/lib/patron-portal-options";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/** "1,250.50" or "1250.5" → 1250.5; anything else fails validation. */
const cedisAmount = (label: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? Number(value.replace(/[,\s]/g, "")) : value),
    z
      .number({ message: `Enter the ${label} in cedis` })
      .finite(`Enter the ${label} in cedis`)
      .min(MIN_DONATION_CEDIS / 100, `Enter the ${label} in cedis`)
      .max(10_000_000, `That ${label} is too large`)
      .refine((n) => Math.round(n * 100) === Number((n * 100).toFixed(4)), "Use at most two decimal places"),
  );

/** YYYY-MM-DD from a date input, not in the future. */
const pastDate = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Choose the ${label}`)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), `Choose the ${label}`)
    .refine((value) => Date.parse(`${value}T00:00:00Z`) <= Date.now() + 24 * 60 * 60 * 1000, `The ${label} can't be in the future`);

export function cedisToPesewas(cedis: number): number {
  return Math.round(cedis * 100);
}

export function dateInputToDate(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

// --- Finances -----------------------------------------------------------------

export const donationSchema = z.object({
  amount: z.preprocess(
    (value) => (typeof value === "string" ? Number(value.replace(/[,\s]/g, "")) : value),
    z
      .number({ message: "Choose or enter an amount" })
      .finite("Choose or enter an amount")
      .min(MIN_DONATION_CEDIS, `The smallest donation is GH₵ ${MIN_DONATION_CEDIS}`)
      .max(MAX_DONATION_CEDIS, `For gifts above GH₵ ${MAX_DONATION_CEDIS.toLocaleString("en-GH")}, please contact the association`)
      .refine((n) => Math.round(n * 100) === Number((n * 100).toFixed(4)), "Use at most two decimal places"),
  ),
  fund: z.enum(DONATION_FUND_VALUES, { message: "Choose a cause" }),
  anonymous: z.boolean(),
});
export type DonationInput = z.infer<typeof donationSchema>;

export const recordedDonationSchema = z.object({
  donorName: z.string().trim().min(2, "Enter who the donation came from").max(200),
  donorEmail: z.string().trim().toLowerCase().email("Enter a valid email address").max(254).optional().or(z.literal("")),
  amount: cedisAmount("amount"),
  fund: z.enum(DONATION_FUND_VALUES, { message: "Choose a cause" }),
  receivedOn: pastDate("date it was received"),
  note: optionalText(500),
  anonymous: z.boolean(),
});
export type RecordedDonationInput = z.infer<typeof recordedDonationSchema>;

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORY_VALUES, { message: "Choose a category" }),
  description: z.string().trim().min(3, "Describe what the money was spent on").max(300),
  amount: cedisAmount("amount"),
  spentOn: pastDate("date"),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

// --- Communication ------------------------------------------------------------

/** Rich text counts as empty when it has no words once the tags are gone. */
function hasText(html: string): boolean {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim().length > 0;
}

export const broadcastSchema = z
  .object({
    audience: z.enum(PATRON_BROADCAST_AUDIENCE_VALUES, { message: "Choose who should receive this" }),
    subject: z.string().trim().min(3, "Add a subject").max(150),
    bodyHtml: z.string().max(50_000, "This message is too long").refine(hasText, "Write your message"),
    sendEmail: z.boolean(),
    postToPortal: z.boolean(),
  })
  .refine((data) => data.sendEmail || data.postToPortal, {
    message: "Choose at least one way to send it",
    path: ["sendEmail"],
  });
export type BroadcastInput = z.infer<typeof broadcastSchema>;

/**
 * An executive's own broadcast. They can write to every group, the patrons
 * included, and they say who it comes from — "the President" and "the
 * Welfare Committee" carry different weight, and members should be told
 * which one is writing.
 */
export const adminBroadcastSchema = z
  .object({
    audience: z.enum(BROADCAST_AUDIENCE_VALUES, { message: "Choose who should receive this" }),
    authorName: z.string().trim().min(2, "Say who this is from").max(120),
    subject: z.string().trim().min(3, "Add a subject").max(150),
    bodyHtml: z.string().max(50_000, "This message is too long").refine(hasText, "Write your message"),
    sendEmail: z.boolean(),
    postToPortal: z.boolean(),
  })
  .refine((data) => data.sendEmail || data.postToPortal, {
    message: "Choose at least one way to send it",
    path: ["sendEmail"],
  });

export const broadcastReviewSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    note: optionalText(1000),
  })
  .refine((data) => data.decision !== "REJECT" || (data.note ?? "").trim().length > 0, {
    message: "Tell the patron why it wasn't approved",
    path: ["note"],
  });

export const threadCreateSchema = z.object({
  addressedTo: z.string().trim().min(2, "Choose who to write to").max(100),
  subject: z.string().trim().min(3, "Add a subject").max(150),
  body: z.string().trim().min(2, "Write your message").max(5000),
});

export const threadReplySchema = z.object({
  body: z.string().trim().min(1, "Write your reply").max(5000),
});

// --- Advocacy -----------------------------------------------------------------

export const endorsementSchema = z.object({
  comment: optionalText(500),
});

export const issueActionSchema = z.object({
  type: z.enum(ISSUE_ACTION_VALUES, { message: "Choose an action" }),
  message: z.string().trim().min(10, "Write at least a sentence").max(3000),
});

export const campaignSchema = z.object({
  title: z.string().trim().min(3, "Add a title").max(200),
  summary: z.string().trim().min(10, "Write a short summary").max(600),
  details: optionalText(10_000),
  initiatedBy: optionalText(200),
  targetBody: optionalText(200),
  status: z.enum(CAMPAIGN_STATUS_VALUES),
});
export type CampaignInput = z.infer<typeof campaignSchema>;

export const issueSchema = z.object({
  title: z.string().trim().min(3, "Add a title").max(200),
  summary: z.string().trim().min(10, "Summarise the issue").max(3000),
  category: z.enum(ISSUE_CATEGORY_VALUES, { message: "Choose a category" }),
  location: optionalText(200),
  status: z.enum(ISSUE_STATUS_VALUES),
  reportedOn: pastDate("date it was reported"),
  resolutionNote: optionalText(2000),
});
export type IssueInput = z.infer<typeof issueSchema>;

// --- Documents ----------------------------------------------------------------

export const patronDocumentSchema = z.object({
  title: z.string().trim().min(3, "Give the document a title").max(200),
  description: optionalText(1000),
});
