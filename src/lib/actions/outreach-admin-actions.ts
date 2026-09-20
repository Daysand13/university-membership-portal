"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { createTutorial, deleteTutorial, updateTutorial } from "@/lib/services/tutorial-service";
import { youTubeVideoId } from "@/lib/outreach-options";
import { AdminRole, type SoftwareCategory, type TutorialSource } from "@/generated/prisma/client";
import {
  tutorialListingSchema,
  allyListingSchema,
  alliesSettingsSchema,
  assistiveSettingsSchema,
  softwareListingSchema,
  softwareRequestUpdateSchema,
} from "@/lib/validations/outreach";
import {
  createAlly,
  deleteAlly,
  markAllySignupReviewed,
  updateAlliesPageSettings,
  updateAlly,
} from "@/lib/services/ally-service";
import {
  createSoftware,
  deleteSoftware,
  updateAssistiveTechSettings,
  updateSoftware,
  updateTechRequest,
} from "@/lib/services/assistive-software-service";
import type { ActionState } from "./types";

/**
 * Admin for the public outreach pages. Both are public-facing content as
 * much as they are membership work, so editors and the membership team can
 * both manage them (super admins pass every check as usual).
 */

const blankToNull = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// ---------------------------------------------------------------------------
// Allies
// ---------------------------------------------------------------------------

async function saveAllyActionImpl(
  allyId: string | null,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("outreach.allies");
  const parsed = allyListingSchema.safeParse({
    type: text(formData, "type"),
    name: text(formData, "name"),
    imageUrl: text(formData, "imageUrl"),
    role: text(formData, "role"),
    organization: text(formData, "organization"),
    sector: text(formData, "sector"),
    statement: text(formData, "statement"),
    spotlightQuote: text(formData, "spotlightQuote"),
    featured: formData.get("featured") === "on",
    websiteUrl: text(formData, "websiteUrl"),
    order: text(formData, "order") || "0",
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const d = parsed.data;
  const fields = {
    type: d.type,
    name: d.name,
    imageUrl: blankToNull(d.imageUrl),
    role: blankToNull(d.role),
    organization: blankToNull(d.organization),
    sector: blankToNull(d.sector),
    statement: blankToNull(d.statement),
    spotlightQuote: blankToNull(d.spotlightQuote),
    featured: d.featured,
    websiteUrl: blankToNull(d.websiteUrl),
    order: d.order,
    isActive: d.isActive,
  };

  revalidatePath("/allies");
  revalidatePath("/admin/allies");
  if (allyId) {
    await updateAlly({ id: allyId, fields, admin });
    return { success: true };
  }
  const ally = await createAlly({ fields, signupId: blankToNull(text(formData, "signupId")), admin });
  redirect(`/admin/allies/${ally.id}?created=1`);
}

async function deleteAllyActionImpl(allyId: string): Promise<void> {
  const admin = await requireCapability("outreach.allies");
  await deleteAlly({ id: allyId, admin });
  revalidatePath("/allies");
  revalidatePath("/admin/allies");
  redirect("/admin/allies");
}

async function markAllySignupReviewedActionImpl(signupId: string): Promise<void> {
  await requireCapability("outreach.allies");
  await markAllySignupReviewed(signupId);
  revalidatePath("/admin/allies/signups");
}

async function saveAlliesSettingsActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireCapability("outreach.allies");
  const parsed = alliesSettingsSchema.safeParse({ partnershipEmail: text(formData, "partnershipEmail") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  await updateAlliesPageSettings(parsed.data, admin.id);
  revalidatePath("/allies");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Assistive software
// ---------------------------------------------------------------------------

async function saveSoftwareActionImpl(
  softwareId: string | null,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("outreach.software");
  const parsed = softwareListingSchema.safeParse({
    name: text(formData, "name"),
    logoUrl: text(formData, "logoUrl"),
    category: text(formData, "category"),
    platforms: formData.getAll("platforms").filter((p): p is string => typeof p === "string"),
    description: text(formData, "description"),
    isFree: text(formData, "licence") !== "FUNDED",
    telegramUrl: text(formData, "telegramUrl"),
    websiteUrl: text(formData, "websiteUrl"),
    order: text(formData, "order") || "0",
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const d = parsed.data;
  const fields = {
    name: d.name,
    logoUrl: blankToNull(d.logoUrl),
    category: d.category,
    platforms: d.platforms,
    description: d.description,
    isFree: d.isFree,
    telegramUrl: blankToNull(d.telegramUrl),
    websiteUrl: blankToNull(d.websiteUrl),
    order: d.order,
    isActive: d.isActive,
  };

  revalidatePath("/tech-tutorials");
  revalidatePath("/admin/tech-tutorials");
  if (softwareId) {
    await updateSoftware(softwareId, fields, admin);
    return { success: true };
  }
  const software = await createSoftware(fields, admin);
  redirect(`/admin/tech-tutorials/${software.id}?created=1`);
}

async function deleteSoftwareActionImpl(softwareId: string): Promise<void> {
  const admin = await requireCapability("outreach.software");
  await deleteSoftware(softwareId, admin);
  revalidatePath("/tech-tutorials");
  revalidatePath("/admin/tech-tutorials");
  redirect("/admin/tech-tutorials");
}

async function saveAssistiveSettingsActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireCapability("outreach.software");
  const parsed = assistiveSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  await updateAssistiveTechSettings(
    {
      telegramUrl: parsed.data.telegramUrl ?? "",
      supportEmail: parsed.data.supportEmail,
      licenceTierCedis: parsed.data.licenceTierCedis,
      hardwareTierCedis: parsed.data.hardwareTierCedis,
    },
    admin.id,
  );
  revalidatePath("/tech-tutorials");
  return { success: true };
}

async function updateTechRequestActionImpl(
  requestId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("outreach.software.requests");
  const parsed = softwareRequestUpdateSchema.safeParse({
    status: text(formData, "status"),
    adminNote: text(formData, "adminNote"),
    notify: formData.get("notify") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await updateTechRequest({
    id: requestId,
    admin,
    status: parsed.data.status,
    adminNote: blankToNull(parsed.data.adminNote),
    notify: parsed.data.notify,
  });
  revalidatePath("/admin/tech-tutorials/requests");
  revalidatePath(`/admin/tech-tutorials/requests/${requestId}`);
  return { success: true };
}

export const saveAllyAction = withActionErrorHandling("saveAllyAction", saveAllyActionImpl);
export const deleteAllyAction = withVoidActionErrorHandling("deleteAllyAction", deleteAllyActionImpl);
export const markAllySignupReviewedAction = withVoidActionErrorHandling(
  "markAllySignupReviewedAction",
  markAllySignupReviewedActionImpl,
);
export const saveAlliesSettingsAction = withActionErrorHandling("saveAlliesSettingsAction", saveAlliesSettingsActionImpl);
export const saveSoftwareAction = withActionErrorHandling("saveSoftwareAction", saveSoftwareActionImpl);
export const deleteSoftwareAction = withVoidActionErrorHandling("deleteSoftwareAction", deleteSoftwareActionImpl);
export const saveAssistiveSettingsAction = withActionErrorHandling(
  "saveAssistiveSettingsAction",
  saveAssistiveSettingsActionImpl,
);
export const updateTechRequestAction = withActionErrorHandling(
  "updateTechRequestAction",
  updateTechRequestActionImpl,
);

// ---------------------------------------------------------------------------
// Tutorials
// ---------------------------------------------------------------------------

async function saveTutorialActionImpl(
  tutorialId: string | null,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("outreach.software");
  const parsed = tutorialListingSchema.safeParse({
    title: text(formData, "title"),
    description: text(formData, "description"),
    source: text(formData, "source"),
    url: text(formData, "url"),
    thumbnailUrl: text(formData, "thumbnailUrl"),
    category: text(formData, "category"),
    durationLabel: text(formData, "durationLabel"),
    order: text(formData, "order") || "0",
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const d = parsed.data;
  // A YouTube link that carries no video id can't be played or given a
  // still, so it is caught here rather than showing an empty card.
  if (d.source === "YOUTUBE" && !youTubeVideoId(d.url)) {
    return { fieldErrors: { url: ["That doesn't look like a YouTube video link."] } };
  }

  const fields = {
    title: d.title,
    description: d.description,
    source: d.source as TutorialSource,
    url: d.url,
    thumbnailUrl: blankToNull(d.thumbnailUrl),
    category: (blankToNull(d.category) as SoftwareCategory | null) ?? null,
    durationLabel: blankToNull(d.durationLabel),
    order: d.order,
    isActive: d.isActive,
  };

  revalidatePath("/tech-tutorials");
  revalidatePath("/admin/tech-tutorials/tutorials");
  if (tutorialId) {
    await updateTutorial(tutorialId, fields, admin);
    return { success: true, message: "Saved. The tutorial is up to date." };
  }
  const created = await createTutorial(fields, admin);
  redirect(`/admin/tech-tutorials/tutorials/${created.id}`);
}

async function deleteTutorialActionImpl(tutorialId: string): Promise<void> {
  const admin = await requireCapability("outreach.software");
  await deleteTutorial(tutorialId, admin);
  revalidatePath("/tech-tutorials");
  revalidatePath("/admin/tech-tutorials/tutorials");
  redirect("/admin/tech-tutorials/tutorials");
}

export const saveTutorialAction = withActionErrorHandling("saveTutorialAction", saveTutorialActionImpl);
export const deleteTutorialAction = withVoidActionErrorHandling("deleteTutorialAction", deleteTutorialActionImpl);
