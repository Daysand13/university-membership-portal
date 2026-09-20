"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole, requireAdminUser, requireCapability } from "@/lib/auth/admin";
import { AdminRole, type TeamMemberType } from "@/generated/prisma/client";
import { aboutContentSchema, teamMemberSchema, donateContentSchema, siteSettingsSchema, socialLinkSchema } from "@/lib/validations/content";
import {
  updateAboutContent,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getTeamMemberById,
  updateDonateContent,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  updateSiteSettings,
  upsertSocialLink,
  deleteSocialLink,
} from "@/lib/services/content-service";
import { resolveMapLocation, MapLinkUnreachableError } from "@/lib/services/map-service";
import type { ActionState } from "./types";

async function updateAboutActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireCapability("content.about");
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
  await requireCapability("content.donate");
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

function heroSlideFields(formData: FormData) {
  const imageUrl = formData.get("imageUrl");
  const backgroundColor = formData.get("backgroundColor");
  return {
    title: String(formData.get("title") ?? "").trim(),
    subtitle: String(formData.get("subtitle") ?? "").trim() || null,
    imageUrl: typeof imageUrl === "string" && imageUrl ? imageUrl : null,
    backgroundColor: typeof backgroundColor === "string" && backgroundColor ? backgroundColor : null,
    ctaText: String(formData.get("ctaText") ?? "").trim() || null,
    ctaUrl: String(formData.get("ctaUrl") ?? "").trim() || null,
    order: Number(formData.get("order") ?? 0) || 0,
    isActive: formData.get("isActive") === "on",
  };
}

function revalidateHeroSlides() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/hero-slides");
}

async function createHeroSlideActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireCapability("content.hero");
  const fields = heroSlideFields(formData);
  if (!fields.title) return { fieldErrors: { title: ["Give the slide a title"] } };

  await createHeroSlide({
    ...fields,
    subtitle: fields.subtitle ?? undefined,
    imageUrl: fields.imageUrl ?? undefined,
    backgroundColor: fields.backgroundColor ?? undefined,
    ctaText: fields.ctaText ?? undefined,
    ctaUrl: fields.ctaUrl ?? undefined,
  });
  revalidateHeroSlides();
  redirect("/admin/hero-slides?created=1");
}

async function updateHeroSlideActionImpl(id: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireCapability("content.hero");
  const fields = heroSlideFields(formData);
  if (!fields.title) return { fieldErrors: { title: ["Give the slide a title"] } };

  await updateHeroSlide(id, fields);
  revalidateHeroSlides();
  // Stays put so the form can say it saved.
  return { success: true };
}

/** The show/hide switch on the slides list. */
async function setHeroSlideActiveActionImpl(id: string, isActive: boolean): Promise<void> {
  await requireCapability("content.hero");
  await updateHeroSlide(id, { isActive });
  revalidateHeroSlides();
}

async function deleteHeroSlideActionImpl(id: string): Promise<void> {
  await requireCapability("content.hero");
  await deleteHeroSlide(id);
  // Deleting from the slide's own page would otherwise leave the person on
  // a page that no longer exists.
  redirect("/admin/hero-slides");
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/hero-slides");
}

async function updateSiteSettingsActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireCapability("site.settings");
  const logoUrl = formData.get("logoUrl");
  const faviconUrl = formData.get("faviconUrl");
  const parsed = siteSettingsSchema.safeParse({
    ...Object.fromEntries(formData),
    logoUrl: typeof logoUrl === "string" && logoUrl ? logoUrl : null,
    faviconUrl: typeof faviconUrl === "string" && faviconUrl ? faviconUrl : null,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  // Catch a link that isn't a map now, while the admin is looking at the
  // field, rather than as a silently missing map on the public pages later.
  if (parsed.data.mapEmbedUrl) {
    try {
      const location = await resolveMapLocation(parsed.data.mapEmbedUrl);
      if (!location) {
        return {
          fieldErrors: {
            mapEmbedUrl: [
              "That link doesn't point to a place on Google Maps. Open the location in Google Maps, tap Share, and paste that link here.",
            ],
          },
        };
      }
    } catch (err) {
      // Google couldn't be reached to check a short link just now. That says
      // nothing about the link itself, so save it — the pages retry.
      if (!(err instanceof MapLinkUnreachableError)) throw err;
    }
  }

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

/**
 * Leadership listings are site content, edited by editors. Patron profiles
 * belong to the Patrons section, which the membership team runs — editors
 * keep access to them too.
 */
async function requireTeamEditor(type: TeamMemberType) {
  return requireCapability(type === "PATRON" ? "members.patrons" : "content.team");
}

async function listingType(id: string): Promise<TeamMemberType> {
  return (await getTeamMemberById(id))?.type ?? "LEADERSHIP";
}

/** Leadership shows on About Us; patrons on the Patrons page. */
function revalidateTeamViews() {
  revalidatePath("/about");
  revalidatePath("/patrons");
  revalidatePath("/admin/team");
  revalidatePath("/admin/patrons/profiles");
}

async function createTeamMemberActionImpl(formData: FormData): Promise<ActionState> {
  await requireTeamEditor(formData.get("type") === "PATRON" ? "PATRON" : "LEADERSHIP");
  const parsed = teamMemberSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    position: formData.get("position"),
    bio: formData.get("bio"),
    order: formData.get("order") ?? 0,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const photoUrl = formData.get("photoUrl");
  const memberId = formData.get("memberId");
  let created;
  try {
    created = await createTeamMember({
      ...parsed.data,
      photoUrl: typeof photoUrl === "string" && photoUrl ? photoUrl : undefined,
      memberId: typeof memberId === "string" && memberId ? memberId : null,
    });
  } catch (err) {
    // The only thing this throws deliberately is the "already linked to
    // someone else" check — a normal validation outcome, not a bug.
    return { error: err instanceof Error ? err.message : "Could not save this entry." };
  }
  revalidateTeamViews();
  redirect(created.type === "PATRON" ? `/admin/patrons/profiles/${created.id}` : `/admin/team/${created.id}`);
}

async function updateTeamMemberActionImpl(id: string, formData: FormData): Promise<ActionState> {
  await requireTeamEditor(await listingType(id));
  const photoUrl = formData.get("photoUrl");
  const memberId = formData.get("memberId");
  try {
    await updateTeamMember(id, {
      name: String(formData.get("name") ?? ""),
      position: String(formData.get("position") ?? ""),
      bio: String(formData.get("bio") ?? "") || null,
      photoUrl: typeof photoUrl === "string" && photoUrl ? photoUrl : null,
      order: Number(formData.get("order") ?? 0),
      isActive: formData.get("isActive") === "on",
      memberId: typeof memberId === "string" && memberId ? memberId : null,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save this entry." };
  }
  revalidateTeamViews();
  return {};
}

async function deleteTeamMemberActionImpl(id: string): Promise<void> {
  await requireTeamEditor(await listingType(id));
  await deleteTeamMember(id);
  revalidateTeamViews();
}

/** Deletes a patron profile from its edit page, then returns to the list. */
async function deletePatronProfileListingActionImpl(id: string): Promise<void> {
  await requireTeamEditor("PATRON");
  const listing = await getTeamMemberById(id);
  if (listing?.type === "PATRON") await deleteTeamMember(id);
  revalidateTeamViews();
  redirect("/admin/patrons/profiles");
}

async function setTeamMemberActiveActionImpl(id: string, isActive: boolean): Promise<void> {
  await requireTeamEditor(await listingType(id));
  await updateTeamMember(id, { isActive });
  revalidateTeamViews();
}

// ---------------------------------------------------------------------------
// Exported actions, each wrapped so an unexpected failure surfaces as a
// friendly message instead of a raw server-error page. See
// ./with-error-handling.ts for why this is done at the boundary.
// ---------------------------------------------------------------------------

export const updateAboutAction = withActionErrorHandling("updateAboutAction", updateAboutActionImpl);
export const updateDonateAction = withActionErrorHandling("updateDonateAction", updateDonateActionImpl);
export const createHeroSlideAction = withActionErrorHandling("createHeroSlideAction", createHeroSlideActionImpl);
export const updateHeroSlideAction = withActionErrorHandling("updateHeroSlideAction", updateHeroSlideActionImpl);
export const setHeroSlideActiveAction = withVoidActionErrorHandling(
  "setHeroSlideActiveAction",
  setHeroSlideActiveActionImpl,
);
export const deleteHeroSlideAction = withVoidActionErrorHandling("deleteHeroSlideAction", deleteHeroSlideActionImpl);
export const updateSiteSettingsAction = withActionErrorHandling("updateSiteSettingsAction", updateSiteSettingsActionImpl);
export const upsertSocialLinkAction = withActionErrorHandling("upsertSocialLinkAction", upsertSocialLinkActionImpl);
export const deleteSocialLinkAction = withVoidActionErrorHandling("deleteSocialLinkAction", deleteSocialLinkActionImpl);
export const createTeamMemberAction = withActionErrorHandling("createTeamMemberAction", createTeamMemberActionImpl);
export const updateTeamMemberAction = withActionErrorHandling("updateTeamMemberAction", updateTeamMemberActionImpl);
export const deleteTeamMemberAction = withVoidActionErrorHandling("deleteTeamMemberAction", deleteTeamMemberActionImpl);
export const setTeamMemberActiveAction = withVoidActionErrorHandling("setTeamMemberActiveAction", setTeamMemberActiveActionImpl);
export const deletePatronProfileListingAction = withVoidActionErrorHandling(
  "deletePatronProfileListingAction",
  deletePatronProfileListingActionImpl,
);
