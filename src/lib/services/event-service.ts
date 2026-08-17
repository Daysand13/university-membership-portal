import "server-only";
import { db } from "@/lib/db";
import { ContentStatus, Prisma } from "@/generated/prisma/client";
import { slugify } from "@/lib/validations/content";
import type { EventInput } from "@/lib/validations/content";

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = slugify(base) || "event";
  let suffix = 1;
  while (
    await db.event.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    suffix += 1;
    candidate = `${slugify(base)}-${suffix}`;
  }
  return candidate;
}

/**
 * "Past" vs "upcoming" is computed from endDate rather than stored, so an
 * event automatically moves itself the moment it ends — no admin action or
 * scheduled job required.
 */
export async function listPublishedEvents(params?: {
  when: "upcoming" | "past";
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 9;
  const now = new Date();

  const where: Prisma.EventWhereInput = {
    status: ContentStatus.PUBLISHED,
    ...(params?.when === "past" ? { endDate: { lt: now } } : { endDate: { gte: now } }),
  };

  const [items, total] = await Promise.all([
    db.event.findMany({
      where,
      include: { category: true },
      orderBy: { startDate: params?.when === "past" ? "desc" : "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.event.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getUpcomingEventsForHome(limit = 3) {
  return db.event.findMany({
    where: { status: ContentStatus.PUBLISHED, endDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    take: limit,
  });
}

export async function getPublishedEventBySlug(slug: string) {
  return db.event.findFirst({
    where: { slug, status: ContentStatus.PUBLISHED },
    include: { category: true },
  });
}

// --- Admin -------------------------------------------------------------

export async function listEventsForAdmin(params?: { search?: string }) {
  return db.event.findMany({
    where: params?.search ? { title: { contains: params.search, mode: "insensitive" } } : {},
    include: { category: true },
    orderBy: { startDate: "desc" },
  });
}

export async function getEventForAdmin(id: string) {
  return db.event.findUnique({ where: { id } });
}

export async function createEvent(input: EventInput, imageUrl: string | null, adminId: string) {
  const slug = await uniqueSlug(input.slug || input.title);
  return db.event.create({
    data: {
      title: input.title,
      slug,
      description: input.description,
      shortDescription: input.shortDescription || null,
      imageUrl,
      startDate: input.startDate,
      endDate: input.endDate,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      venue: input.venue,
      organizer: input.organizer || null,
      contactInfo: input.contactInfo || null,
      registrationLink: input.registrationLink || null,
      externalLink: input.externalLink || null,
      categoryId: input.categoryId || null,
      status: input.status,
      featured: input.featured,
      createdById: adminId,
    },
  });
}

export async function updateEvent(id: string, input: EventInput, imageUrl: string | null | undefined) {
  const existing = await db.event.findUniqueOrThrow({ where: { id } });
  const slug = input.slug && input.slug !== existing.slug ? await uniqueSlug(input.slug, id) : existing.slug;

  return db.event.update({
    where: { id },
    data: {
      title: input.title,
      slug,
      description: input.description,
      shortDescription: input.shortDescription || null,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      startDate: input.startDate,
      endDate: input.endDate,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      venue: input.venue,
      organizer: input.organizer || null,
      contactInfo: input.contactInfo || null,
      registrationLink: input.registrationLink || null,
      externalLink: input.externalLink || null,
      categoryId: input.categoryId || null,
      status: input.status,
      featured: input.featured,
    },
  });
}

export async function deleteEvent(id: string) {
  return db.event.delete({ where: { id } });
}

export async function setEventStatus(id: string, status: ContentStatus) {
  return db.event.update({ where: { id }, data: { status } });
}

export async function listEventCategories() {
  return db.eventCategory.findMany({ orderBy: { name: "asc" } });
}
