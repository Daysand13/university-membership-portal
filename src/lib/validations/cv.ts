import { z } from "zod";

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

export const educationEntrySchema = z.object({
  institution: text(SHORT).min(2, "Name the school or university"),
  qualification: optional(SHORT),
  /** Free text on purpose: "2021", "Sept 2021", "2021 – present". */
  period: optional(60),
  grade: optional(SHORT),
  details: optional(LINE),
});

export const experienceEntrySchema = z.object({
  role: text(SHORT).min(2, "What was the role?"),
  organisation: optional(SHORT),
  period: optional(60),
  details: optional(PARAGRAPH),
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

export const cvSchema = z.object({
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
});

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
  const list = <T>(value: unknown, schema: z.ZodType<T>): T[] =>
    Array.isArray(value) ? value.map((item) => schema.safeParse(item)).flatMap((r) => (r.success ? [r.data] : [])) : [];

  return {
    ...EMPTY_CV,
    headline: typeof source.headline === "string" ? source.headline : "",
    summary: typeof source.summary === "string" ? source.summary : "",
    contactEmail: typeof source.contactEmail === "string" ? source.contactEmail : "",
    contactPhone: typeof source.contactPhone === "string" ? source.contactPhone : "",
    location: typeof source.location === "string" ? source.location : "",
    education: list(source.education, educationEntrySchema),
    experience: list(source.experience, experienceEntrySchema),
    skills: list(source.skills, simpleEntrySchema),
    languages: list(source.languages, simpleEntrySchema),
    activities: list(source.activities, simpleEntrySchema),
    referees: list(source.referees, refereeEntrySchema),
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
