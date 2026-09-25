import { z } from "zod";
import { SignatureKind } from "@/generated/prisma/enums";

/**
 * A letter, in the parts a letter is made of.
 *
 * Asking for the pieces separately rather than one big box is the whole
 * point: somebody who cannot see the page cannot tell whether their
 * address ended up above or below the date, or how far down the signature
 * fell. They supply the words; the arrangement is done for them.
 */

const SHORT = 150;
const BLOCK = 400;
const BODY = 12_000;

const text = (max: number) => z.string().trim().max(max);
const optional = (max: number) => text(max).optional().or(z.literal(""));

/** "Yours faithfully" to a stranger, "Yours sincerely" to a named person. */
export const CLOSINGS = [
  "Yours faithfully",
  "Yours sincerely",
  "Yours truly",
  "Respectfully yours",
  "Kind regards",
] as const;

export const SALUTATIONS = [
  "Dear Sir/Madam",
  "Dear Sir",
  "Dear Madam",
  "To Whom It May Concern",
] as const;

export const letterSchema = z
  .object({
    title: text(SHORT).min(2, "Give the letter a name so you can find it again"),

    senderName: text(SHORT).min(2, "Your name goes at the foot of the letter"),
    senderAddress: optional(BLOCK),
    senderPhone: optional(40),
    senderEmail: z.string().trim().max(254).email("Check this email address").optional().or(z.literal("")),

    /** Empty means the day it is downloaded. */
    letterDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
      .optional()
      .or(z.literal("")),

    recipientName: optional(SHORT),
    recipientTitle: optional(SHORT),
    recipientOrganisation: optional(SHORT),
    recipientAddress: optional(BLOCK),

    salutation: text(SHORT).min(2, "How does the letter open?"),
    subject: optional(BLOCK),
    body: text(BODY).min(40, "There isn't a letter here yet"),
    closing: text(SHORT).min(2, "How does the letter sign off?"),

    signatureKind: z
      .enum([SignatureKind.NONE, SignatureKind.DRAWN, SignatureKind.TYPED])
      .default(SignatureKind.NONE),
    signatureData: z.string().trim().max(400_000).optional().or(z.literal("")),
  })
  .refine((letter) => letter.signatureKind === SignatureKind.NONE || Boolean((letter.signatureData ?? "").trim()), {
    message: "Sign it, or choose not to sign",
    path: ["signatureData"],
  })
  .refine((letter) => letter.signatureKind !== SignatureKind.TYPED || (letter.signatureData ?? "").length <= 40, {
    message: "Initials, not a sentence",
    path: ["signatureData"],
  });

export type LetterInput = z.infer<typeof letterSchema>;

export const EMPTY_LETTER: LetterInput = {
  title: "",
  senderName: "",
  senderAddress: "",
  senderPhone: "",
  senderEmail: "",
  letterDate: "",
  recipientName: "",
  recipientTitle: "",
  recipientOrganisation: "",
  recipientAddress: "",
  salutation: "Dear Sir/Madam",
  subject: "",
  body: "",
  closing: "Yours faithfully",
  signatureKind: SignatureKind.NONE,
  signatureData: "",
};

/**
 * Splits what was typed into paragraphs.
 *
 * A blank line starts a new one, and nothing else is interpreted — no
 * markup to learn, and no surprise when a line beginning with a dash comes
 * out as a bullet in somebody's job application.
 */
export function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean);
}

/** The lines of an address block, blanks dropped. */
export function addressLines(block: string | null | undefined): string[] {
  return (block ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** "25 September 2026", as a letter dates itself. */
export function letterDateLabel(value: string | null | undefined, fallback: Date = new Date()): string {
  const date = value ? new Date(`${value}T12:00:00Z`) : fallback;
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Accra",
  }).format(Number.isNaN(date.getTime()) ? fallback : date);
}
