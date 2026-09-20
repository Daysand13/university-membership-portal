import "server-only";
import { db } from "@/lib/db";
import type { AdminUser, SoftwareCategory, SoftwareRequestStatus, TechRequestKind } from "@/generated/prisma/client";
import { deliver, firstNameOf } from "@/lib/services/account-notification-service";
import { notifyAdminsOfTechRequest } from "@/lib/services/outreach-notification-service";
import {
  DEFAULT_ASSISTIVE_TECH_SETTINGS,
  SOFTWARE_REQUEST_STATUS_LABELS,
  softwareCategoryLabel,
  type AssistiveTechSettings,
} from "@/lib/outreach-options";

/**
 * The Assistive Software page: the directory of tools, where to get each
 * one (the association's Telegram library), and requests for tools the
 * library doesn't have yet — which the technical team sources, buying paid
 * licences with donations.
 */

const SETTINGS_KEY = "assistive-tech";

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getAssistiveTechSettings(): Promise<AssistiveTechSettings> {
  try {
    const record = await db.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
    return { ...DEFAULT_ASSISTIVE_TECH_SETTINGS, ...((record?.value as Partial<AssistiveTechSettings>) ?? {}) };
  } catch (err) {
    console.error("[assistive-tech] could not load the page settings — using defaults", err);
    return DEFAULT_ASSISTIVE_TECH_SETTINGS;
  }
}

export async function updateAssistiveTechSettings(settings: AssistiveTechSettings, adminId: string) {
  await db.siteSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: { ...settings } },
    create: { key: SETTINGS_KEY, value: { ...settings } },
  });
  await db.auditLog.create({
    data: {
      adminId,
      action: "UPDATE_ASSISTIVE_TECH_SETTINGS",
      entityType: "SiteSetting",
      entityId: SETTINGS_KEY,
      newValue: { ...settings },
    },
  });
}

// ---------------------------------------------------------------------------
// The directory
// ---------------------------------------------------------------------------

export interface SoftwareFields {
  name: string;
  logoUrl: string | null;
  category: SoftwareCategory;
  platforms: string[];
  description: string;
  isFree: boolean;
  telegramUrl: string | null;
  websiteUrl: string | null;
  order: number;
  isActive: boolean;
}

export async function listPublicSoftware() {
  return db.assistiveSoftware.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

export async function listSoftwareForAdmin() {
  return db.assistiveSoftware.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }, { name: "asc" }] });
}

export async function getSoftware(id: string) {
  return db.assistiveSoftware.findUnique({ where: { id } });
}

export async function createSoftware(fields: SoftwareFields, admin: Pick<AdminUser, "id">) {
  const software = await db.assistiveSoftware.create({ data: fields });
  await db.auditLog.create({
    data: { adminId: admin.id, action: "CREATE_SOFTWARE", entityType: "AssistiveSoftware", entityId: software.id, newValue: { name: software.name } },
  });
  return software;
}

export async function updateSoftware(id: string, fields: SoftwareFields, admin: Pick<AdminUser, "id">) {
  const software = await db.assistiveSoftware.update({ where: { id }, data: fields });
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "UPDATE_SOFTWARE",
      entityType: "AssistiveSoftware",
      entityId: id,
      newValue: { name: software.name, isActive: software.isActive },
    },
  });
  return software;
}

export async function deleteSoftware(id: string, admin: Pick<AdminUser, "id">) {
  const software = await db.assistiveSoftware.delete({ where: { id } });
  await db.auditLog.create({
    data: { adminId: admin.id, action: "DELETE_SOFTWARE", entityType: "AssistiveSoftware", entityId: id, previousValue: { name: software.name } },
  });
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export async function createTechRequest(input: {
  kind: TechRequestKind;
  fullName: string;
  email: string;
  topic: string;
  category: SoftwareCategory;
  operatingSystem: string | null;
  notes: string | null;
  memberId: string | null;
}) {
  const request = await db.softwareRequest.create({ data: input });
  await notifyAdminsOfTechRequest(request);
  // A receipt, so the person knows it arrived and what happens next.
  await deliver({
    to: { email: request.email, firstName: firstNameOf(request.fullName) },
    template: "software-request-received",
    entityType: "SoftwareRequest",
    entityId: request.id,
    build: () => ({
      subject: `We've received your request for ${request.topic}`,
      paragraphs: [
        "Thank you — your request is with the association's technical team.",
        request.kind === "TUTORIAL"
          ? "The team records walk-throughs as they can, and publishes them on the Tech & Tutorials page. We'll email you when yours is up, or if we can point you to one that already covers it."
          : "If the software is free, we'll add it to the Telegram library. If it needs a paid licence, the team will see whether donated funds can cover it. Either way, we'll email you with what we can do.",
      ],
      details: [
        { label: request.kind === "TUTORIAL" ? "Tutorial" : "Software", value: request.topic },
        { label: "For", value: softwareCategoryLabel(request.category) },
        ...(request.operatingSystem ? [{ label: "On", value: request.operatingSystem }] : []),
      ],
    }),
  });
  return request;
}

export async function listTechRequests(filter?: { status?: SoftwareRequestStatus; kind?: TechRequestKind }) {
  return db.softwareRequest.findMany({
    where: { ...(filter?.status ? { status: filter.status } : {}), ...(filter?.kind ? { kind: filter.kind } : {}) },
    orderBy: { createdAt: "desc" },
    include: { handledBy: { select: { name: true } } },
    take: 300,
  });
}

export async function getTechRequest(id: string) {
  return db.softwareRequest.findUnique({
    where: { id },
    include: {
      handledBy: { select: { name: true } },
      member: { select: { id: true, firstName: true, lastName: true, indexNumber: true } },
    },
  });
}

export async function countSoftwareRequestsByStatus(): Promise<Record<SoftwareRequestStatus, number>> {
  const groups = await db.softwareRequest.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<SoftwareRequestStatus, number> = {
    NEW: 0,
    IN_PROGRESS: 0,
    FULFILLED: 0,
    UNFULFILLABLE: 0,
    DECLINED: 0,
  };
  for (const group of groups) counts[group.status] = group._count._all;
  return counts;
}

/**
 * Moves a request along, and — when asked — tells the person who made it.
 *
 * Each status says something different to somebody waiting, so each one
 * gets its own subject and opening line rather than a single "your request
 * changed" for all five. Whatever the team typed is quoted back, and where
 * there is somewhere to go, the email carries a button straight to it.
 */
export async function updateTechRequest(params: {
  id: string;
  admin: Pick<AdminUser, "id">;
  status: SoftwareRequestStatus;
  adminNote: string | null;
  resourceLink: string | null;
  notify: boolean;
}) {
  const { id, admin, status, adminNote, resourceLink, notify } = params;
  const before = await db.softwareRequest.findUniqueOrThrow({ where: { id } });
  const request = await db.softwareRequest.update({
    where: { id },
    data: { status, adminNote, resourceLink, handledById: admin.id },
  });

  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "UPDATE_TECH_REQUEST",
      entityType: "SoftwareRequest",
      entityId: id,
      previousValue: { status: before.status },
      newValue: { status, resourceLink },
      note: adminNote,
    },
  });

  if (notify) {
    const isTutorial = request.kind === "TUTORIAL";
    const thing = isTutorial ? "tutorial" : "software";
    const message = REQUEST_UPDATE_MESSAGES[status](request.topic, thing);

    await deliver({
      to: { email: request.email, firstName: firstNameOf(request.fullName) },
      template: `tech-request-${status.toLowerCase()}`,
      entityType: "SoftwareRequest",
      entityId: id,
      build: () => ({
        subject: message.subject,
        paragraphs: message.paragraphs,
        details: [
          { label: isTutorial ? "Tutorial" : "Software", value: request.topic },
          { label: "Status", value: SOFTWARE_REQUEST_STATUS_LABELS[status] },
          ...(adminNote ? [{ label: "From the team", value: adminNote }] : []),
        ],
        // Somewhere to go beats a link to paste: the resource itself where
        // there is one, otherwise the page the rest of it lives on.
        cta: resourceLink
          ? { path: resourceLink, label: isTutorial ? "Watch the tutorial" : "Get the software" }
          : { path: "/tech-tutorials", label: "Open Tech & Tutorials" },
      }),
    });
  }
  return request;
}

/** One opening per status, in the words somebody waiting would want to read. */
const REQUEST_UPDATE_MESSAGES: Record<
  SoftwareRequestStatus,
  (topic: string, thing: string) => { subject: string; paragraphs: string[] }
> = {
  FULFILLED: (topic, thing) => ({
    subject: `Ready for you: ${topic}`,
    paragraphs: [
      `Good news — the ${thing} you asked the association's technical team for is available now.`,
      "Everything the team added is below. If anything doesn't work the way you expected, reply to the team on Telegram and they'll help you set it up.",
    ],
  }),
  UNFULFILLABLE: (topic, thing) => ({
    subject: `About your request for ${topic}`,
    paragraphs: [
      `The team couldn't provide that ${thing} exactly as you asked — often because it needs a paid licence the association can't cover yet, or it isn't available for your device.`,
      "What they can offer instead is below.",
    ],
  }),
  IN_PROGRESS: (topic) => ({
    subject: `Update on your request for ${topic}`,
    paragraphs: ["Someone on the technical team has picked up your request and is working on it.", "Here's where it stands."],
  }),
  DECLINED: (topic) => ({
    subject: `Update on your request for ${topic}`,
    paragraphs: ["Your request has been closed.", "The team's reason is below. If circumstances change, you're welcome to ask again."],
  }),
  NEW: (topic) => ({
    subject: `Update on your request for ${topic}`,
    paragraphs: ["There's an update on what you asked the association's technical team for."],
  }),
};
