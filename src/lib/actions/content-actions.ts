"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { requireAdminRole, requireAdminUser } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { aboutContentSchema, teamMemberSchema, donateContentSchema, siteSettingsSchema, socialLinkSchema } from "@/lib/validations/content";
import {
  updateAboutContent,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  updateDonateContent,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  updateSiteSettings,
  upsertSocialLink,
  deleteSocialLink,
} from "@/lib/services/content-service";
import type { ActionState } from "./types";

async function updateAboutActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminRole(AdminRole.EDITOR);
  const parsed = aboutContentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const imageUrl = formData.get("imageUrl");
  await updateAboutContent({
    ...parsed.data,
    imageUrl: typeof imageUrl === "string" && imageUrl ? imageUrl : null,
  });

  revalidatePath("/about");
  revalidatePath("/admin/about");
  return {};
}

async function updateDonateActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminRole(AdminRole.EDITOR, AdminRole.SUPER_ADMIN);
  const parsed = donateContentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const qrCodeImageUrl = formData.get("qrCodeImageUrl");
  const bannerImageUrl = formData.get("bannerImageUrl");
  await updateDonateContent({
    ...parsed.data,
    qrCodeImageUrl: typeof qrCodeImageUrl === "string" && qrCodeImageUrl ? qrCodeImageUrl : null,
    bannerImageUrl: typeof bannerImageUrl === "string" && bannerImageUrl ? bannerImageUrl : null,
  });

  revalidatePath("/donate");
  revalidatePath("/admin/donate");
  return {};
}

async function createHeroSlideActionImpl(formData: FormData): Promise<void> {
  await requireAdminRole(AdminRole.EDITOR);
  const imageUrl = formData.get("imageUrl");
  const backgroundColor = formData.get("backgroundColor");
  await createHeroSlide({
    title: String(formData.get("title") ?? ""),
    subtitle: String(formData.get("subtitle") ?? "") || undefined,
    imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
    backgroundColor: typeof backgroundColor === "string" && backgroundColor ? backgroundColor : undefined,
    ctaText: String(formData.get("ctaText") ?? "") || undefined,
    ctaUrl: String(formData.get("ctaUrl") ?? "") || undefined,
    order: Number(formData.get("order") ?? 0),
    isActive: formData.get("isActive") === "on",
  });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/hero-slides");
}

async function updateHeroSlideActionImpl(id: string, formData: FormData): Promise<void> {
  await requireAdminRole(AdminRole.EDITOR);
  const imageUrl = formData.get("imageUrl");
  const backgroundColor = formData.get("backgroundColor");
  await updateHeroSlide(id, {
    title: String(formData.get("title") ?? ""),
    subtitle: String(formData.get("subtitle") ?? "") || null,
    imageUrl: typeof imageUrl === "string" && imageUrl ? imageUrl : null,
    backgroundColor: typeof backgroundColor === "string" && backgroundColor ? backgroundColor : null,
    ctaText: String(formData.get("ctaText") ?? "") || null,
    ctaUrl: String(formData.get("ctaUrl") ?? "") || null,
    order: Number(formData.get("order") ?? 0),
    isActive: formData.get("isActive") === "on",
  });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/hero-slides");
}

async function deleteHeroSlideActionImpl(id: string): Promise<void> {
  await requireAdminRole(AdminRole.EDITOR);
  await deleteHeroSlide(id);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/hero-slides");
}

async function updateSiteSettingsActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminRole(AdminRole.SUPER_ADMIN);
  const logoUrl = formData.get("logoUrl");
  const faviconUrl = formData.get("faviconUrl");
  const parsed = siteSettingsSchema.safeParse({
    ...Object.fromEntries(formData),
    logoUrl: typeof logoUrl === "string" && logoUrl ? logoUrl : null,
    faviconUrl: typeof faviconUrl === "string" && faviconUrl ? faviconUrl : null,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await updateSiteSettings(parsed.data);
  revalidatePath("/", "layout");
  return {};
}

async function upsertSocialLinkActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminUser();
  const parsed = socialLinkSchema.safeParse({
    id: formData.get("id") || undefined,
    platform: formData.get("platform"),
    displayName: formData.get("displayName"),
    url: formData.get("url"),
    isActive: formData.get("isActive") === "on",
    order: formData.get("order") ?? 0,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await upsertSocialLink(parsed.data);
  revalidatePath("/", "layout");
  revalidatePath("/admin/social-links");
  return {};
}

async function deleteSocialLinkActionImpl(id: string): Promise<void> {
  await requireAdminUser();
  await deleteSocialLink(id);
  revalidatePath("/", "layout");
  revalidatePath("/admin/social-links");
}

// ---------------------------------------------------------------------------
// Team Members (Executive Leadership + Our Patrons)
// ---------------------------------------------------------------------------

async function createTeamMemberActionImpl(formData: FormData): Promise<void> {
  await requireAdminRole(AdminRole.EDITOR);
  const parsed = teamMemberSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    position: formData.get("position"),
    bio: formData.get("bio"),
    order: formData.get("order") ?? 0,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return;

  const photoUrl = formData.get("photoUrl");
  await createTeamMember({
    ...parsed.data,
    photoUrl: typeof photoUrl === "string" && photoUrl ? photoUrl : undefined,
  });
  revalidatePath("/about");
  revalidatePath("/admin/team");
}

async function updateTeamMemberActionImpl(id: string, formData: FormData): Promise<void> {
  await requireAdminRole(AdminRole.EDITOR);
  const photoUrl = formData.get("photoUrl");
  await updateTeamMember(id, {
    name: String(formData.get("name") ?? ""),
    position: String(formData.get("position") ?? ""),
    bio: String(formData.get("bio") ?? "") || null,
    photoUrl: typeof photoUrl === "string" && photoUrl ? photoUrl : null,
    order: Number(formData.get("order") ?? 0),
    isActive: formData.get("isActive") === "on",
  });
  revalidatePath("/about");
  revalidatePath("/admin/team");
}

async function deleteTeamMemberActionImpl(id: string): Promise<void> {
  await requireAdminRole(AdminRole.EDITOR);
  await deleteTeamMember(id);
  revalidatePath("/about");
  revalidatePath("/admin/team");
}

// ---------------------------------------------------------------------------
// Exported actions, each wrapped so an unexpected failure surfaces as a
// friendly message instead of a raw server-error page. See
// ./with-error-handling.ts for why this is done at the boundary.
// ---------------------------------------------------------------------------

export const updateAboutAction = withActionErrorHandling("updateAboutAction", updateAboutActionImpl);
export const updateDonateAction = withActionErrorHandling("updateDonateAction", updateDonateActionImpl);
export const createHeroSlideAction = withVoidActionErrorHandling("createHeroSlideAction", createHeroSlideActionImpl);
export const updateHeroSlideAction = withVoidActionErrorHandling("updateHeroSlideAction", updateHeroSlideActionImpl);
export const deleteHeroSlideAction = withVoidActionErrorHandling("deleteHeroSlideAction", deleteHeroSlideActionImpl);
export const updateSiteSettingsAction = withActionErrorHandling("updateSiteSettingsAction", updateSiteSettingsActionImpl);
export const upsertSocialLinkAction = withActionErrorHandling("upsertSocialLinkAction", upsertSocialLinkActionImpl);
export const deleteSocialLinkAction = withVoidActionErrorHandling("deleteSocialLinkAction", deleteSocialLinkActionImpl);
export const createTeamMemberAction = withVoidActionErrorHandling("createTeamMemberAction", createTeamMemberActionImpl);
export const updateTeamMemberAction = withVoidActionErrorHandling("updateTeamMemberAction", updateTeamMemberActionImpl);
export const deleteTeamMemberAction = withVoidActionErrorHandling("deleteTeamMemberAction", deleteTeamMemberActionImpl);
