"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole, ContentStatus } from "@/generated/prisma/client";
import { eventSchema } from "@/lib/validations/content";
import { createEvent, updateEvent, deleteEvent, setEventStatus } from "@/lib/services/event-service";
import { extractObjectKeyFromPublicUrl, deleteObject } from "@/lib/storage/r2";
import type { ActionState } from "./types";

function parseEventForm(formData: FormData) {
  return eventSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    description: formData.get("description"),
    shortDescription: formData.get("shortDescription") || undefined,
    imageKey: formData.get("imageKey") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
    venue: formData.get("venue"),
    organizer: formData.get("organizer") || undefined,
    contactInfo: formData.get("contactInfo") || undefined,
    registrationLink: formData.get("registrationLink") || undefined,
    externalLink: formData.get("externalLink") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    status: formData.get("status") ?? ContentStatus.DRAFT,
    featured: formData.get("featured") === "on",
  });
}

async function createEventActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireCapability("content.events");
  const parsed = parseEventForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  if (parsed.data.status !== ContentStatus.DRAFT) await requireCapability("content.events.publish");

  const imageUrl = formData.get("imageUrl");
  const event = await createEvent(
    parsed.data,
    typeof imageUrl === "string" && imageUrl ? imageUrl : null,
    admin.id,
  );

  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath("/admin/events");
  // To the saved event, as News does — landing back on the list gave no
  // sign that anything had been saved.
  redirect(`/admin/events/${event.id}?created=1`);
}

async function updateEventActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireCapability("content.events");
  const parsed = parseEventForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  if (parsed.data.status !== ContentStatus.DRAFT) await requireCapability("content.events.publish");
  const id = parsed.data.id;
  if (!id) return { error: "Missing event id." };

  const imageUrlRaw = formData.get("imageUrl");
  const imageUrl = typeof imageUrlRaw === "string" ? imageUrlRaw : undefined;

  const updated = await updateEvent(id, parsed.data, imageUrl || null);

  revalidatePath("/events");
  revalidatePath(`/events/${updated.slug}`);
  revalidatePath("/");
  revalidatePath("/admin/events");
  // Stays put so the form can say it saved.
  return { success: true };
}

async function deleteEventActionImpl(id: string): Promise<void> {
  await requireCapability("content.events.publish");
  const event = await deleteEvent(id);
  const key = extractObjectKeyFromPublicUrl(event.imageUrl);
  if (key) {
    try {
      await deleteObject(key);
    } catch (err) {
      console.error("[events] failed to delete R2 image:", err);
    }
  }
  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath("/admin/events");
}

async function setEventStatusActionImpl(id: string, status: ContentStatus): Promise<void> {
  await requireCapability("content.events.publish");
  await setEventStatus(id, status);
  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath("/admin/events");
}

// ---------------------------------------------------------------------------
// Exported actions, each wrapped so an unexpected failure surfaces as a
// friendly message instead of a raw server-error page. See
// ./with-error-handling.ts for why this is done at the boundary.
// ---------------------------------------------------------------------------

export const createEventAction = withActionErrorHandling("createEventAction", createEventActionImpl);
export const updateEventAction = withActionErrorHandling("updateEventAction", updateEventActionImpl);
export const deleteEventAction = withVoidActionErrorHandling("deleteEventAction", deleteEventActionImpl);
export const setEventStatusAction = withVoidActionErrorHandling("setEventStatusAction", setEventStatusActionImpl);
