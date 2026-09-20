import "server-only";
import { db } from "@/lib/db";
import type { AdminUser, SoftwareCategory, TutorialSource } from "@/generated/prisma/client";
import { youTubeVideoId } from "@/lib/outreach-options";

/**
 * The video walk-throughs on the Tech & Tutorials page.
 *
 * The videos themselves stay where they were published — YouTube or
 * TikTok — so they keep their captions, their player and their audience.
 * What lives here is only what the site needs to show a card and let
 * someone watch: the link, a still, and words describing it.
 */

export interface TutorialFields {
  title: string;
  description: string;
  source: TutorialSource;
  url: string;
  thumbnailUrl: string | null;
  category: SoftwareCategory | null;
  durationLabel: string | null;
  order: number;
  isActive: boolean;
}

/** The id is derived, never typed: whatever shape of YouTube link was pasted. */
function withVideoId(fields: TutorialFields) {
  return { ...fields, videoId: fields.source === "YOUTUBE" ? youTubeVideoId(fields.url) : null };
}

export async function listPublicTutorials() {
  return db.tutorial.findMany({ where: { isActive: true }, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export async function listTutorialsForAdmin() {
  return db.tutorial.findMany({ orderBy: [{ source: "asc" }, { order: "asc" }, { createdAt: "desc" }] });
}

export async function getTutorial(id: string) {
  return db.tutorial.findUnique({ where: { id } });
}

export async function createTutorial(fields: TutorialFields, admin: Pick<AdminUser, "id">) {
  const tutorial = await db.tutorial.create({ data: withVideoId(fields) });
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "CREATE_TUTORIAL",
      entityType: "Tutorial",
      entityId: tutorial.id,
      newValue: { title: tutorial.title, source: tutorial.source },
    },
  });
  return tutorial;
}

export async function updateTutorial(id: string, fields: TutorialFields, admin: Pick<AdminUser, "id">) {
  const tutorial = await db.tutorial.update({ where: { id }, data: withVideoId(fields) });
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "UPDATE_TUTORIAL",
      entityType: "Tutorial",
      entityId: id,
      newValue: { title: tutorial.title, source: tutorial.source, isActive: tutorial.isActive },
    },
  });
  return tutorial;
}

export async function deleteTutorial(id: string, admin: Pick<AdminUser, "id">) {
  const tutorial = await db.tutorial.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "DELETE_TUTORIAL",
      entityType: "Tutorial",
      entityId: id,
      previousValue: { title: tutorial.title },
    },
  });
}
