import { z } from "zod";
import { SignatureKind } from "@/generated/prisma/enums";

/**
 * What a member types into their CV.
 *
 * The repeating sections arrive as one JSON field rather than a hundred
 * numbered form inputs: the page builds the rows, and everything is
 * checked here before it goes anywhere near the database or a PDF.
 *
 * Every field is optional except the ones a CV is unreadable without. A
 * first-year with no work history should still be able to produce one.
 */

const SHORT = 150;
const LINE = 300;
const PARAGRAPH = 1200;

const text = (max: number) => z.string().trim().max(max);
const optional = (max: number) => text(max).optional().or(z.literal(""));

/** "2026-09", as an <input type="month"> gives it. */
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const month = z
  .string()
  .trim()
  .regex(MONTH_PATTERN, "Pick a month and year")
  .optional()
  .or(z.literal(""));

/**
 * A stretch of time on a CV. Dates are picked, not typed, so "Sept 2021"
 * and "09/2021" can't end up in the same list — and anything still going
 * on says so rather than needing an end date invented for it.
 */
const dated = {
  startMonth: month,
  endMonth: month,
  current: z.boolean().optional().default(false),
  /** What earlier versions stored as free text. Read, never written. */
  period: optional(60),
};

export const educationEntrySchema = z
  .object({
    institution: text(SHORT).min(2, "Name the school or university"),
    qualification: optional(SHORT),
    details: optional(LINE),
    ...dated,
  })
  .refine((entry) => entry.current || !entry.startMonth || !entry.endMonth || entry.endMonth >= entry.startMonth, {
    message: "That finishes before it starts",
    path: ["endMonth"],
  });

export const experienceEntrySchema = z
  .object({
    role: text(SHORT).min(2, "What was the role?"),
    organisation: optional(SHORT),
    details: optional(PARAGRAPH),
    ...dated,
  })
  .refine((entry) => entry.current || !entry.startMonth || !entry.endMonth || entry.endMonth >= entry.startMonth, {
    message: "That finishes before it starts",
    path: ["endMonth"],
  });

export const refereeEntrySchema = z.object({
  name: text(SHORT).min(2, "Name the referee"),
  position: optional(SHORT),
  organisation: optional(SHORT),
  email: z.string().trim().max(254).email("That referee's email doesn't look right").optional().or(z.literal("")),
  phone: optional(40),
});

export const simpleEntrySchema = z.object({
  /** A skill, a language, a club — one line each. */
  label: text(SHORT).min(1),
  /** "Fluent", "Treasurer, 2024" — the qualifier on that line. */
  note: optional(SHORT),
});

/**
 * A signature that works for everybody.
 *
 * Drawing one with a mouse is no use to a student who cannot see the pad,
 * and neither is a scanned image to somebody with no steady hand — so
 * typed initials are a first-class choice here, not a fallback.
 */
export const signatureSchema = z.object({
  signatureKind: z.enum([SignatureKind.NONE, SignatureKind.DRAWN, SignatureKind.TYPED]).default(SignatureKind.NONE),
  /** A PNG data URI when drawn, the letters themselves when typed. */
  signatureData: z.string().trim().max(400_000).optional().or(z.literal("")),
});

export const cvSchema = z
  .object({
    headline: optional(LINE),
    summary: optional(PARAGRAPH),
    contactEmail: z.string().trim().max(254).email("Check this email address").optional().or(z.literal("")),
    contactPhone: optional(40),
    location: optional(SHORT),

    education: z.array(educationEntrySchema).max(12, "That is more schooling than a CV can hold"),
    experience: z.array(experienceEntrySchema).max(20, "Keep it to the twenty most relevant"),
    skills: z.array(simpleEntrySchema).max(30),
    languages: z.array(simpleEntrySchema).max(12),
    activities: z.array(simpleEntrySchema).max(20),
    referees: z.array(refereeEntrySchema).max(4, "Three referees is plenty"),
    ...signatureSchema.shape,
  })
  .refine(
    (cv) => cv.signatureKind === SignatureKind.NONE || Boolean((cv.signatureData ?? "").trim()),
    { message: "Sign it, or choose not to sign", path: ["signatureData"] },
  )
  .refine(
    (cv) => cv.signatureKind !== SignatureKind.TYPED || (cv.signatureData ?? "").trim().length <= 40,
    { message: "Initials, not a sentence", path: ["signatureData"] },
  );

export type CvInput = z.infer<typeof cvSchema>;
export type EducationEntry = z.infer<typeof educationEntrySchema>;
export type ExperienceEntry = z.infer<typeof experienceEntrySchema>;
export type RefereeEntry = z.infer<typeof refereeEntrySchema>;
export type SimpleEntry = z.infer<typeof simpleEntrySchema>;

export const EMPTY_CV: CvInput = {
  headline: "",
  summary: "",
  contactEmail: "",
  contactPhone: "",
  location: "",
  education: [],
  experience: [],
  skills: [],
  languages: [],
  activities: [],
  referees: [],
  signatureKind: SignatureKind.NONE,
  signatureData: "",
};

/**
 * Reads what came out of the database, which is whatever was valid when it
 * was written. A row that no longer parses gives back an empty section
 * rather than breaking the page somebody is trying to edit.
 */
export function cvFromRecord(record: unknown): CvInput {
  const parsed = cvSchema.safeParse(record);
  if (parsed.success) return parsed.data;

  const source = (record ?? {}) as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const list = <T>(value: unknown, schema: z.ZodType<T>): T[] =>
    Array.isArray(value) ? value.map((item) => schema.safeParse(item)).flatMap((r) => (r.success ? [r.data] : [])) : [];

  const kind = Object.values(SignatureKind).includes(source.signatureKind as SignatureKind)
    ? (source.signatureKind as SignatureKind)
    : SignatureKind.NONE;

  return {
    ...EMPTY_CV,
    headline: str(source.headline),
    summary: str(source.summary),
    contactEmail: str(source.contactEmail),
    contactPhone: str(source.contactPhone),
    location: str(source.location),
    education: list(source.education, educationEntrySchema),
    experience: list(source.experience, experienceEntrySchema),
    skills: list(source.skills, simpleEntrySchema),
    languages: list(source.languages, simpleEntrySchema),
    activities: list(source.activities, simpleEntrySchema),
    referees: list(source.referees, refereeEntrySchema),
    signatureKind: kind,
    signatureData: str(source.signatureData),
  };
}

/** Is there enough here to print? A name alone is not a CV. */
export function cvHasSubstance(cv: CvInput): boolean {
  return Boolean(
    (cv.summary ?? "").trim() ||
      (cv.headline ?? "").trim() ||
      cv.education.length ||
      cv.experience.length ||
      cv.skills.length,
  );
}

// --- Dates on the page -------------------------------------------------------

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2021-09" becomes "Sept 2021"; anything unrecognisable is left alone. */
export function monthLabel(value: string | undefined): string {
  if (!value) return "";
  const match = MONTH_PATTERN.exec(value);
  if (!match) return value;
  const [year, month] = value.split("-");
  return `${MONTH_NAMES[Number(month) - 1].slice(0, 3)} ${year}`;
}

interface Dateable {
  startMonth?: string;
  endMonth?: string;
  current?: boolean;
  period?: string;
}

/** "Sept 2021 – present", or whatever earlier versions stored as free text. */
export function periodLabel(entry: Dateable): string {
  const start = monthLabel(entry.startMonth);
  const end = entry.current ? "present" : monthLabel(entry.endMonth);
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return end;
  return entry.period ?? "";
}

/**
 * Newest first, which is the order an employer reads a CV in.
 *
 * Anything still going on sorts above everything finished, however
 * recently it finished. Entries with no dates at all keep the order they
 * were typed in, at the bottom — there is nothing to sort them by, and
 * shuffling them would look like a bug.
 */
export function newestFirst<T extends Dateable>(entries: T[]): T[] {
  const rank = (entry: T) => {
    if (entry.current) return "9999-99";
    return entry.endMonth || entry.startMonth || "";
  };
  return [...entries]
    .map((entry, index) => ({ entry, index, key: rank(entry) }))
    .sort((a, b) => {
      if (!a.key && !b.key) return a.index - b.index;
      if (!a.key) return 1;
      if (!b.key) return -1;
      if (a.key !== b.key) return a.key < b.key ? 1 : -1;
      return a.index - b.index;
    })
    .map((row) => row.entry);
}
