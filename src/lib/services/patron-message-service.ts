import "server-only";
import { db } from "@/lib/db";
import type { PatronProfile, PatronThreadStatus } from "@/generated/prisma/client";
import {
  notifyAdminsOfPatronMessage,
  notifyPatronOfReply,
} from "@/lib/services/patron-portal-notification-service";
import { DEFAULT_EXECUTIVE_CONTACTS, WHOLE_EXECUTIVE } from "@/lib/patron-portal-options";

/**
 * The Direct Executive Channel: private conversations between a patron and
 * the executive team. Patrons write from the Patrons' Portal; the team
 * answers from Admin > Patrons > Messages, and the patron is emailed each
 * reply.
 */

export class PatronThreadError extends Error {}

type PatronForThread = Pick<PatronProfile, "id" | "email" | "title" | "fullName">;

function displayName(patron: Pick<PatronProfile, "title" | "fullName">): string {
  return [patron.title, patron.fullName].filter(Boolean).join(" ");
}

/** Who a patron can address: the whole committee, then each current position. */
export async function listExecutiveContacts(): Promise<string[]> {
  const listings = await db.teamMember.findMany({
    where: { type: "LEADERSHIP", isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { position: true },
  });
  const positions = [...new Set(listings.map((l) => l.position.trim()).filter(Boolean))];
  return [WHOLE_EXECUTIVE, ...(positions.length > 0 ? positions : DEFAULT_EXECUTIVE_CONTACTS)];
}

export async function createPatronThread(params: {
  patron: PatronForThread;
  addressedTo: string;
  subject: string;
  body: string;
}) {
  const { patron, addressedTo, subject, body } = params;
  const thread = await db.patronThread.create({
    data: {
      patronId: patron.id,
      addressedTo,
      subject,
      unreadByAdmin: true,
      messages: { create: { sender: "PATRON", body } },
    },
  });
  await notifyAdminsOfPatronMessage({ thread, patronName: displayName(patron), body, isNewThread: true });
  return thread;
}

export async function listThreadsForPatron(patronId: string) {
  return db.patronThread.findMany({
    where: { patronId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, sender: true, createdAt: true } },
      _count: { select: { messages: true } },
    },
    take: 100,
  });
}

/** Opens a conversation for its patron and marks the team's replies as read. */
export async function openThreadForPatron(patronId: string, threadId: string) {
  const thread = await db.patronThread.findFirst({
    where: { id: threadId, patronId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { admin: { select: { name: true } } },
      },
    },
  });
  if (thread?.unreadByPatron) {
    await db.patronThread.update({ where: { id: thread.id }, data: { unreadByPatron: false } });
  }
  return thread;
}

/** A patron's reply. Writing into a closed conversation reopens it. */
export async function replyAsPatron(params: { patron: PatronForThread; threadId: string; body: string }) {
  const { patron, threadId, body } = params;
  const thread = await db.patronThread.findFirst({ where: { id: threadId, patronId: patron.id } });
  if (!thread) throw new PatronThreadError("That conversation couldn't be found.");

  const now = new Date();
  await db.$transaction([
    db.patronMessage.create({ data: { threadId, sender: "PATRON", body } }),
    db.patronThread.update({
      where: { id: threadId },
      data: { lastMessageAt: now, unreadByAdmin: true, status: "OPEN" },
    }),
  ]);
  await notifyAdminsOfPatronMessage({ thread, patronName: displayName(patron), body, isNewThread: false });
}

export async function countUnreadThreadsForPatron(patronId: string): Promise<number> {
  return db.patronThread.count({ where: { patronId, unreadByPatron: true } });
}

// ---------------------------------------------------------------------------
// Admin side
// ---------------------------------------------------------------------------

export async function listThreadsForAdmin(status?: PatronThreadStatus) {
  return db.patronThread.findMany({
    where: status ? { status } : {},
    orderBy: [{ unreadByAdmin: "desc" }, { lastMessageAt: "desc" }],
    include: {
      patron: { select: { title: true, fullName: true, organization: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, sender: true } },
    },
    take: 300,
  });
}

export async function countUnreadThreadsForAdmin(): Promise<number> {
  return db.patronThread.count({ where: { unreadByAdmin: true } });
}

export async function openThreadForAdmin(threadId: string) {
  const thread = await db.patronThread.findUnique({
    where: { id: threadId },
    include: {
      patron: {
        select: { id: true, title: true, fullName: true, email: true, phone: true, organization: true, jobTitle: true },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { admin: { select: { name: true } } },
      },
    },
  });
  if (thread?.unreadByAdmin) {
    await db.patronThread.update({ where: { id: thread.id }, data: { unreadByAdmin: false } });
  }
  return thread;
}

export async function replyAsAdmin(params: { adminId: string; threadId: string; body: string }) {
  const { adminId, threadId, body } = params;
  const thread = await db.patronThread.findUnique({
    where: { id: threadId },
    include: { patron: { select: { id: true, email: true, title: true, fullName: true } } },
  });
  if (!thread) throw new PatronThreadError("That conversation couldn't be found.");

  const now = new Date();
  await db.$transaction([
    db.patronMessage.create({ data: { threadId, sender: "ADMIN", adminId, body } }),
    db.patronThread.update({
      where: { id: threadId },
      data: { lastMessageAt: now, unreadByPatron: true, unreadByAdmin: false, status: "OPEN" },
    }),
  ]);
  await db.auditLog.create({
    data: { adminId, action: "REPLY_PATRON_MESSAGE", entityType: "PatronThread", entityId: threadId },
  });
  await notifyPatronOfReply({ patron: thread.patron, thread, body });
}

export async function setThreadStatus(params: { adminId: string; threadId: string; status: PatronThreadStatus }) {
  await db.patronThread.update({
    where: { id: params.threadId },
    data: { status: params.status, ...(params.status === "CLOSED" ? { unreadByAdmin: false } : {}) },
  });
  await db.auditLog.create({
    data: {
      adminId: params.adminId,
      action: params.status === "CLOSED" ? "CLOSE_PATRON_THREAD" : "REOPEN_PATRON_THREAD",
      entityType: "PatronThread",
      entityId: params.threadId,
    },
  });
}
