"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";
import {
  upsertAlumniSpotlight,
  removeAlumniSpotlight,
  setAlumniPublicProfile,
} from "@/lib/services/alumni-spotlight-admin-service";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import type { ActionState } from "./types";

/**
 * Publishing an alumnus to the open web is a content decision about a real
 * person, so these sit behind the same permission as the rest of alumni
 * management, and each writes an audit entry inside its own transaction
 * (see alumni-spotlight-admin-service.ts).
 */

/**
 * The editor page is revalidated by id as well as the public pages —
 * without it, an admin who clicks "Make private" is left looking at a page
 * still saying the profile is public, because the server component that
 * rendered that line isn't re-run just because the action succeeded.
 */
function revalidateShowcase(alumniId: string) {
  revalidatePath("/alumni");
  revalidatePath("/alumni/[slug]", "page");
  revalidatePath("/admin/alumni");
  revalidatePath(`/admin/alumni/${alumniId}/feature`);
  revalidatePath("/");
}

const optionalText = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((v) => (v ? v : null));

const spotlightSchema = z.object({
  alumniId: z.string().min(1),
  headline: optionalText,
  summary: optionalText,
  story: optionalText,
  imageUrl: optionalText,
  category: optionalText,
  quote: optionalText,
  displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
  showOnHomepage: z.coerce.boolean().default(false),
  published: z.coerce.boolean().default(false),
});

async function saveAlumniSpotlightActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);

  // Unchecked checkboxes are simply absent from FormData; coerce.boolean()
  // would read that as undefined rather than false, so they're normalised
  // here instead of relying on the schema default.
  const raw = Object.fromEntries(formData);
  const parsed = spotlightSchema.safeParse({
    ...raw,
    showOnHomepage: formData.get("showOnHomepage") === "on",
    published: formData.get("published") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { alumniId, ...data } = parsed.data;
  await upsertAlumniSpotlight({ alumniId, adminId: admin.id, data });
  revalidateShowcase(alumniId);
  return { success: true };
}

async function removeAlumniSpotlightActionImpl(alumniId: string): Promise<void> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  await removeAlumniSpotlight({ alumniId, adminId: admin.id });
  revalidateShowcase(alumniId);
}

async function setAlumniPublicProfileActionImpl(alumniId: string, isPublic: boolean): Promise<void> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  await setAlumniPublicProfile({ alumniId, adminId: admin.id, isPublic });
  revalidateShowcase(alumniId);
}

export const saveAlumniSpotlightAction = withActionErrorHandling(
  "saveAlumniSpotlightAction",
  saveAlumniSpotlightActionImpl,
);
export const removeAlumniSpotlightAction = withVoidActionErrorHandling(
  "removeAlumniSpotlightAction",
  removeAlumniSpotlightActionImpl,
);
export const setAlumniPublicProfileAction = withVoidActionErrorHandling(
  "setAlumniPublicProfileAction",
  setAlumniPublicProfileActionImpl,
);
