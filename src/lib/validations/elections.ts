import { z } from "zod";
import { CandidateStatus, ElectionPhase } from "@/generated/prisma/enums";

/**
 * What the Electoral Commission types in, and what a member types when
 * they stand for office.
 *
 * Ghana keeps GMT the whole year round, so a time typed into one of these
 * forms is the same instant in UTC — no offset to apply and none to get
 * wrong on the morning of a vote.
 */

const SHORT_TEXT = 200;
const NOTE_TEXT = 500;
const MANIFESTO_TEXT = 3000;

export function accraInputToDate(value: string): Date {
  return new Date(`${value}:00Z`);
}

/** A Date as a datetime-local field wants it: "2026-11-14T08:00". */
export function dateToAccraInput(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 16);
}

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const votingWindowSchema = z
  .object({
    opensAt: z.string().trim().min(1, "Say when voting opens"),
    closesAt: z.string().trim().min(1, "Say when voting closes"),
  })
  .refine((data) => accraInputToDate(data.closesAt) > accraInputToDate(data.opensAt), {
    message: "Voting has to close after it opens",
    path: ["closesAt"],
  });

export const extendVotingSchema = z.object({
  // Twelve hours is already far beyond anything reasonable; past that,
  // somebody has typed the wrong thing.
  minutes: z.coerce.number().int().min(5, "Add at least five minutes").max(720, "That is more than half a day"),
  reason: optionalText(NOTE_TEXT),
});

export const electionPhaseSchema = z.object({
  phase: z.enum([ElectionPhase.SCHEDULED, ElectionPhase.OPEN, ElectionPhase.POSTPONED, ElectionPhase.CLOSED], {
    message: "Choose what is happening",
  }),
  /** Read out at the terminals and shown on the website, so it is plain English. */
  notice: optionalText(NOTE_TEXT),
});

/** Whole cedis in, pesewas out — nobody types "2000" meaning twenty. */
const feeInCedis = z.coerce
  .number()
  .min(0, "A fee cannot be negative")
  .max(1000, "That is more than anybody would pay to stand")
  .default(0)
  .transform((cedis) => Math.round(cedis * 100));

export const positionSchema = z.object({
  title: z.string().trim().min(2, "Name the post").max(SHORT_TEXT),
  order: z.coerce.number().int().min(0).max(99).default(0),
  nominationFeePesewas: feeInCedis,
});

export const nominationFeeSchema = z.object({
  nominationFeePesewas: feeInCedis,
});

/** What the association charges its members each year. */
export const duesRatesSchema = z.object({
  fresherOrPgFirstYear: feeInCedis,
  continuing: feeInCedis,
  executive: feeInCedis,
});

export const candidateSchema = z.object({
  name: z.string().trim().min(2, "Give the candidate's name").max(SHORT_TEXT),
  positionId: z.string().trim().min(1, "Choose the post they are standing for"),
  photoUrl: optionalText(500),
  manifesto: optionalText(MANIFESTO_TEXT),
});

export const candidateReviewSchema = z.object({
  status: z.enum([CandidateStatus.APPROVED, CandidateStatus.REJECTED, CandidateStatus.WITHDRAWN], {
    message: "Choose an outcome",
  }),
  note: optionalText(NOTE_TEXT),
});

export const nominationSchema = z.object({
  positionId: z.string().trim().min(1, "Choose the post you are standing for"),
  manifesto: z
    .string()
    .trim()
    .min(40, "Say a little more about what you would do — at least forty characters")
    .max(MANIFESTO_TEXT),
  /** "portal-cv", or a file they uploaded themselves. */
  supportingChoice: z.enum(["portal-cv", "upload", "none"]).default("none"),
  supportingUrl: optionalText(500),
  supportingName: optionalText(SHORT_TEXT),
});

export const stationSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Give the terminal a short code")
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Letters, numbers and hyphens only"),
  name: z.string().trim().min(3, "Say where this terminal stands").max(SHORT_TEXT),
});

export type VotingWindowInput = z.infer<typeof votingWindowSchema>;
export type NominationInput = z.infer<typeof nominationSchema>;
export type StationInput = z.infer<typeof stationSchema>;
