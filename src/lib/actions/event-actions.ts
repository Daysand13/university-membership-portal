"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole } from "@/lib/auth/admin";
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

export async function createEventAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.EDITOR);
  const parsed = parseEventForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const imageUrl = formData.get("imageUrl");
  await createEvent(
    parsed.data,
    typeof imageUrl === "string" && imageUrl ? imageUrl : null,
    admin.id,
  );

  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function updateEventAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminRole(AdminRole.EDITOR);
  const parsed = parseEventForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = parsed.data.id;
  if (!id) return { error: "Missing event id." };

  const imageUrlRaw = formData.get("imageUrl");
  const imageUrl = typeof imageUrlRaw === "string" ? imageUrlRaw : undefined;

  const updated = await updateEvent(id, parsed.data, imageUrl || null);

  revalidatePath("/events");
  revalidatePath(`/events/${updated.slug}`);
  revalidatePath("/");
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function deleteEventAction(id: string): Promise<void> {
  await requireAdminRole(AdminRole.EDITOR);
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

export async function setEventStatusAction(id: string, status: ContentStatus): Promise<void> {
  await requireAdminRole(AdminRole.EDITOR);
  await setEventStatus(id, status);
  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath("/admin/events");
}
