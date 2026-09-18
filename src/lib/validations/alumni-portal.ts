import { z } from "zod";
import { OPPORTUNITY_TYPE_VALUES } from "@/lib/portal-options";

/**
 * What the Alumni Portal accepts beyond the profile itself: posts to the
 * opportunity board, mentoring availability, and backing a campaign.
 * Donations re-use the patrons' donationSchema — a gift is a gift, whoever
 * gives it.
 */

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const opportunitySchema = z
  .object({
    title: z.string().trim().min(3, "Add a title").max(200),
    organization: z.string().trim().min(2, "Who is it with?").max(200),
    type: z.enum(OPPORTUNITY_TYPE_VALUES, { message: "Choose what kind of opportunity this is" }),
    location: optionalText(200),
    description: z.string().trim().min(30, "Describe the role and who it suits").max(5000),
    applyUrl: z
      .string()
      .trim()
      .max(500)
      .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), "Enter a full web address, starting with https://")
      .optional()
      .or(z.literal("")),
    applyEmail: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .refine((value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), "Enter a valid email address")
      .optional()
      .or(z.literal("")),
    closingDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a closing date")
      .refine((value) => Date.parse(`${value}T23:59:59Z`) >= Date.now() - 24 * 60 * 60 * 1000, "That date has passed")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => (data.applyUrl ?? "") !== "" || (data.applyEmail ?? "") !== "", {
    message: "Add a link or an email address so people can apply",
    path: ["applyUrl"],
  });
export type OpportunityInput = z.infer<typeof opportunitySchema>;

export const opportunityReviewSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"], { message: "Choose a decision" }),
    note: optionalText(1000),
  })
  .refine((data) => data.decision !== "REJECT" || (data.note ?? "").trim().length > 0, {
    message: "Tell the alumnus why it wasn't published",
    path: ["note"],
  });

export const mentorSettingsSchema = z.object({
  willingToMentor: z.boolean(),
  mentorAvailability: optionalText(300),
  mentorCapacity: z.coerce
    .number({ message: "How many students at once?" })
    .int("Whole students, please")
    .min(1, "At least one")
    .max(20, "That's a lot — 20 is the maximum"),
});
export type MentorSettingsInput = z.infer<typeof mentorSettingsSchema>;
