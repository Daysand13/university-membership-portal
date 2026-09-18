import { z } from "zod";
import { ISSUE_CATEGORY_VALUES } from "@/lib/patron-portal-options";
import {
  BARRIER_STATUS_VALUES,
  MAX_BARRIER_EVIDENCE_FILES,
  SUPPORT_REQUEST_TYPE_VALUES,
} from "@/lib/portal-options";

/**
 * What the Student Portal accepts: barrier reports, requests for support,
 * study groups and mentorship. Written for people describing a problem in
 * their own words, so every message says what to do rather than what went
 * wrong.
 */

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/** The most a student can ask the welfare fund for in one request, in cedis. */
export const MAX_SUPPORT_REQUEST_CEDIS = 20_000;

/** YYYY-MM-DD from a date input, not in the future. */
const pastDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
  .refine((value) => Date.parse(`${value}T00:00:00Z`) <= Date.now() + 24 * 60 * 60 * 1000, "That date is in the future")
  .optional()
  .or(z.literal(""));

/** YYYY-MM-DD from a date input, not in the past. */
const futureDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
  .refine(
    (value) => Date.parse(`${value}T23:59:59Z`) >= Date.now() - 24 * 60 * 60 * 1000,
    "That date has already passed",
  )
  .optional()
  .or(z.literal(""));

export function dateInputToDate(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

// --- Barrier reports ----------------------------------------------------------

export const barrierReportSchema = z.object({
  title: z.string().trim().min(5, "Give your report a short title").max(200),
  description: z
    .string()
    .trim()
    .min(20, "Please describe what happened in a sentence or two")
    .max(5000, "That's longer than we can accept — please shorten it"),
  category: z.enum(ISSUE_CATEGORY_VALUES, { message: "Choose what this is about" }),
  location: optionalText(200),
  occurredOn: pastDate,
});
export type BarrierReportInput = z.infer<typeof barrierReportSchema>;

/** The evidence tickets posted alongside the form. */
export const evidenceTokensSchema = z
  .array(z.object({ token: z.string().min(1), name: z.string().trim().min(1).max(200) }))
  .max(MAX_BARRIER_EVIDENCE_FILES);

export const barrierTriageSchema = z
  .object({
    status: z.enum(BARRIER_STATUS_VALUES, { message: "Choose a status" }),
    note: z.string().trim().min(3, "Write a short note for the student").max(3000),
    assignedToId: optionalText(60),
  })
  .refine((data) => data.status !== "RESOLVED" || data.note.trim().length >= 10, {
    message: "Say what changed, so the student knows how it was resolved",
    path: ["note"],
  });

export const escalateReportSchema = z.object({
  title: z.string().trim().min(3, "Add a title").max(200),
  summary: z.string().trim().min(20, "Summarise the issue for the patrons").max(3000),
  category: z.enum(ISSUE_CATEGORY_VALUES, { message: "Choose a category" }),
  location: optionalText(200),
});

// --- Support requests ---------------------------------------------------------

export const supportRequestSchema = z
  .object({
    type: z.enum(SUPPORT_REQUEST_TYPE_VALUES, { message: "Choose what you need" }),
    details: z.string().trim().min(20, "Tell us a little more about what you need").max(3000),
    amount: z.string().trim().max(20).optional().or(z.literal("")),
    neededBy: futureDate,
  })
  .superRefine((data, ctx) => {
    if (data.type !== "WELFARE") return;
    const amount = Number((data.amount ?? "").replace(/[,\s]/g, ""));
    if (!data.amount || Number.isNaN(amount) || amount <= 0) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter how much you need, in cedis" });
      return;
    }
    if (amount > MAX_SUPPORT_REQUEST_CEDIS) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "That amount is larger than the fund can consider" });
    }
  });
export type SupportRequestInput = z.infer<typeof supportRequestSchema>;

export const supportReviewSchema = z
  .object({
    decision: z.enum(["APPROVE", "DECLINE"], { message: "Choose a decision" }),
    note: optionalText(2000),
    approvedAmount: z.string().trim().max(20).optional().or(z.literal("")),
  })
  .refine((data) => data.decision !== "DECLINE" || (data.note ?? "").trim().length > 0, {
    message: "Tell the student why, kindly",
    path: ["note"],
  });

export const supportPayoutSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Enter the amount paid out")
    .refine((value) => {
      const n = Number(value.replace(/[,\s]/g, ""));
      return Number.isFinite(n) && n > 0;
    }, "Enter the amount paid out"),
  description: z.string().trim().min(3, "Describe the payout").max(300),
  spentOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date"),
});

// --- Study groups -------------------------------------------------------------

export const studyGroupSchema = z.object({
  name: z.string().trim().min(3, "Give the group a name").max(120),
  focus: z.string().trim().min(2, "What course or subject is it for?").max(120),
  description: optionalText(1000),
  meetingInfo: optionalText(300),
});
export type StudyGroupInput = z.infer<typeof studyGroupSchema>;

// --- Mentorship ---------------------------------------------------------------

export const mentorshipRequestSchema = z.object({
  alumniId: z.string().trim().min(1, "Choose a mentor"),
  requestNote: z.string().trim().min(20, "Say a little about what you'd like help with").max(2000),
});

export const mentorshipMessageSchema = z.object({
  body: z.string().trim().min(1, "Write your message").max(5000),
});

export const mentorshipSessionSchema = z.object({
  scheduledFor: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time")
    .refine((value) => Date.parse(value) > Date.now() - 60 * 60 * 1000, "Choose a time in the future"),
  topic: optionalText(200),
});

export const mentorshipResponseSchema = z
  .object({
    decision: z.enum(["ACCEPT", "DECLINE"], { message: "Choose a decision" }),
    goals: optionalText(1000),
    declineReason: optionalText(500),
  })
  .refine((data) => data.decision !== "DECLINE" || (data.declineReason ?? "").trim().length > 0, {
    message: "A short reason helps the student ask someone else",
    path: ["declineReason"],
  });
