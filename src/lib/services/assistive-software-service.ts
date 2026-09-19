import "server-only";
import { db } from "@/lib/db";
import type { AdminUser, SoftwareCategory, SoftwareRequestStatus } from "@/generated/prisma/client";
import { deliver, firstNameOf } from "@/lib/services/account-notification-service";
import { notifyAdminsOfSoftwareRequest } from "@/lib/services/outreach-notification-service";
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

export async function createSoftwareRequest(input: {
  fullName: string;
  email: string;
  softwareName: string;
  category: SoftwareCategory;
  operatingSystem: string;
  notes: string | null;
  memberId: string | null;
}) {
  const request = await db.softwareRequest.create({ data: input });
  await notifyAdminsOfSoftwareRequest(request);
  // A receipt, so the person knows it arrived and what happens next.
  await deliver({
    to: { email: request.email, firstName: firstNameOf(request.fullName) },
    template: "software-request-received",
    entityType: "SoftwareRequest",
    entityId: request.id,
    build: () => ({
      subject: `We've received your request for ${request.softwareName}`,
      paragraphs: [
        "Thank you — your request is with the association's technical team.",
        "If the software is free, we'll add it to the Telegram library. If it needs a paid licence, the team will see whether donated funds can cover it. Either way, we'll email you with what we can do.",
      ],
      details: [
        { label: "Software", value: request.softwareName },
        { label: "For", value: softwareCategoryLabel(request.category) },
        { label: "On", value: request.operatingSystem },
      ],
    }),
  });
  return request;
}

export async function listSoftwareRequests(status?: SoftwareRequestStatus) {
  return db.softwareRequest.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: { handledBy: { select: { name: true } } },
    take: 300,
  });
}

export async function getSoftwareRequest(id: string) {
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
  const counts: Record<SoftwareRequestStatus, number> = { NEW: 0, IN_PROGRESS: 0, FULFILLED: 0, DECLINED: 0 };
  for (const group of groups) counts[group.status] = group._count._all;
  return counts;
}

/** Moves a request along; optionally tells the person who asked. */
export async function updateSoftwareRequest(params: {
  id: string;
  admin: Pick<AdminUser, "id">;
  status: SoftwareRequestStatus;
  adminNote: string | null;
  notify: boolean;
}) {
  const { id, admin, status, adminNote, notify } = params;
  const before = await db.softwareRequest.findUniqueOrThrow({ where: { id } });
  const request = await db.softwareRequest.update({
    where: { id },
    data: { status, adminNote, handledById: admin.id },
  });

  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "UPDATE_SOFTWARE_REQUEST",
      entityType: "SoftwareRequest",
      entityId: id,
      previousValue: { status: before.status },
      newValue: { status },
      note: adminNote,
    },
  });

  if (notify) {
    await deliver({
      to: { email: request.email, firstName: firstNameOf(request.fullName) },
      template: `software-request-${status.toLowerCase()}`,
      entityType: "SoftwareRequest",
      entityId: id,
      build: () => ({
        subject: `Your request for ${request.softwareName}: ${SOFTWARE_REQUEST_STATUS_LABELS[status].toLowerCase()}`,
        paragraphs: ["There's an update on the software you asked the association's technical team for."],
        details: [
          { label: "Software", value: request.softwareName },
          { label: "Status", value: SOFTWARE_REQUEST_STATUS_LABELS[status] },
          ...(adminNote ? [{ label: "From the team", value: adminNote }] : []),
        ],
      }),
    });
  }
  return request;
}
