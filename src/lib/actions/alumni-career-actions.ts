"use server";

import { revalidatePath } from "next/cache";
import { withActionErrorHandling } from "./with-error-handling";
import { requireAlumni } from "@/lib/auth/alumni";
import { alumniCareerUpdateSchema } from "@/lib/validations/alumni";
import { updateAlumniCareer } from "@/lib/services/alumni-service";
import type { ActionState } from "./types";

function blankToNull(value: string | undefined): string | null {
  return value && value.trim() ? value.trim() : null;
}

async function updateAlumniCareerActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const alumni = await requireAlumni();

  const parsed = alumniCareerUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await updateAlumniCareer(alumni.id, {
      profession: blankToNull(parsed.data.profession),
      currentPosition: blankToNull(parsed.data.currentPosition),
      currentOrganization: blankToNull(parsed.data.currentOrganization),
      industry: blankToNull(parsed.data.industry),
      currentLocation: blankToNull(parsed.data.currentLocation),
      country: blankToNull(parsed.data.country),
      linkedinUrl: blankToNull(parsed.data.linkedinUrl),
      websiteUrl: blankToNull(parsed.data.websiteUrl),
    });
  } catch (err) {
    console.error("[update-alumni-career]", err);
    return { error: "Something went wrong saving your career details. Please try again." };
  }

  revalidatePath("/alumni/dashboard");
  revalidatePath("/alumni/career");
  revalidatePath("/alumni/directory");
  revalidatePath("/alumni/mentorship");
  if (alumni.publicSlug) revalidatePath(`/alumni/${alumni.publicSlug}`);
  return { success: true };
}

export const updateAlumniCareerAction = withActionErrorHandling("updateAlumniCareerAction", updateAlumniCareerActionImpl);
