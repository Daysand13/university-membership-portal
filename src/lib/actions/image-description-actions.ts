"use server";

import { requireAdminUser } from "@/lib/auth/admin";
import {
  getImageDescription,
  saveImageDescription,
  MAX_IMAGE_DESCRIPTION,
} from "@/lib/services/image-description-service";
import { withTypedActionErrorHandling } from "./with-error-handling";

/**
 * The description an administrator types under a picture they've attached.
 *
 * Saved against the picture itself rather than with the surrounding form,
 * so it survives whether or not the article is saved afterwards, and so a
 * picture reused elsewhere keeps what was said about it.
 */
async function saveImageDescriptionImpl(input: { url: string; description: string }) {
  const admin = await requireAdminUser();
  if (!input.url.trim()) return { ok: false as const, error: "There's no picture to describe yet." };
  if (input.description.length > MAX_IMAGE_DESCRIPTION) {
    return { ok: false as const, error: `Keep the description under ${MAX_IMAGE_DESCRIPTION} characters.` };
  }
  await saveImageDescription({ url: input.url, description: input.description, adminId: admin.id });
  return { ok: true as const };
}

async function loadImageDescriptionImpl(url: string) {
  await requireAdminUser();
  return getImageDescription(url);
}

export const saveImageDescriptionAction = withTypedActionErrorHandling(
  "saveImageDescriptionAction",
  saveImageDescriptionImpl,
);
export const loadImageDescriptionAction = withTypedActionErrorHandling(
  "loadImageDescriptionAction",
  loadImageDescriptionImpl,
);
