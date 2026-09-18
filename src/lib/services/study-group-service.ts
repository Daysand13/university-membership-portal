import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { Member } from "@/generated/prisma/client";
import { formatFullName } from "@/lib/format";

/**
 * Study groups students run among themselves — who's revising what, when and
 * where. Deliberately the lightest thing in the portal: students create a
 * group, other students join, and whoever created it can close it when the
 * exam is over. No approval, no moderation queue, no executive in the middle.
 */

export class StudyGroupError extends Error {}

export interface StudyGroupFields {
  name: string;
  focus: string;
  description: string | null;
  meetingInfo: string | null;
}

export async function listStudyGroups(memberId: string) {
  const groups = await db.studyGroup.findMany({
    where: { isOpen: true },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { firstName: true, middleName: true, lastName: true } },
      members: { select: { memberId: true } },
    },
    take: 100,
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    focus: group.focus,
    description: group.description,
    meetingInfo: group.meetingInfo,
    createdAt: group.createdAt,
    startedBy: group.createdBy ? formatFullName(group.createdBy.firstName, group.createdBy.middleName, group.createdBy.lastName) : null,
    memberCount: group.members.length,
    isMine: group.createdByMemberId === memberId,
    hasJoined: group.members.some((m) => m.memberId === memberId),
  }));
}

export async function createStudyGroup(params: { member: Pick<Member, "id">; fields: StudyGroupFields }) {
  const group = await db.studyGroup.create({
    data: {
      ...params.fields,
      createdByMemberId: params.member.id,
      // Whoever starts a group is in it.
      members: { create: { memberId: params.member.id } },
    },
  });
  return group;
}

export async function joinStudyGroup(params: { groupId: string; memberId: string }) {
  const group = await db.studyGroup.findFirst({ where: { id: params.groupId, isOpen: true } });
  if (!group) throw new StudyGroupError("That group isn't taking new members.");
  try {
    await db.studyGroupMember.create({ data: { groupId: params.groupId, memberId: params.memberId } });
  } catch (err) {
    // Already in it — joining twice is harmless, so say nothing.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }
}

export async function leaveStudyGroup(params: { groupId: string; memberId: string }) {
  await db.studyGroupMember.deleteMany({ where: { groupId: params.groupId, memberId: params.memberId } });
}

/** Only the student who started a group can close it. */
export async function closeStudyGroup(params: { groupId: string; memberId: string }) {
  const { count } = await db.studyGroup.updateMany({
    where: { id: params.groupId, createdByMemberId: params.memberId },
    data: { isOpen: false },
  });
  if (count === 0) throw new StudyGroupError("Only the student who started a group can close it.");
}

export async function getStudyGroupMembers(groupId: string) {
  const members = await db.studyGroupMember.findMany({
    where: { groupId },
    orderBy: { joinedAt: "asc" },
    include: { member: { select: { firstName: true, middleName: true, lastName: true, level: true, programme: true } } },
  });
  return members.map((m) => ({
    name: formatFullName(m.member.firstName, m.member.middleName, m.member.lastName),
    level: m.member.level,
    programme: m.member.programme,
    joinedAt: m.joinedAt,
  }));
}

export async function countStudyGroupsForMember(memberId: string): Promise<number> {
  return db.studyGroupMember.count({ where: { memberId, group: { isOpen: true } } });
}
