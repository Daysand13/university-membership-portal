import "server-only";
import { db } from "@/lib/db";

export interface TeamRoleBadge {
  type: "LEADERSHIP" | "PATRON";
  position: string;
}

/**
 * The executive and patron positions a person holds, for the badges on their
 * portal dashboard.
 *
 * Read live from the Leadership & Patrons listings every time rather than
 * stored on the person, so it covers everyone already appointed as well as
 * anyone appointed later, and a badge disappears the moment a listing is
 * removed, unlinked or hidden. Only published (active) listings count — the
 * same rule as the Executive dues rate — so a draft listing an admin hasn't
 * announced yet doesn't show up early.
 *
 * A listing is tied to a member record, so a person is matched through any
 * member record they have: the one they're signed in with, and — through
 * their account — any other, such as the record they held before graduating
 * or before starting a new course.
 */
export async function getTeamRoleBadges(person: {
  memberIds: (string | null | undefined)[];
  userId: string | null | undefined;
}): Promise<TeamRoleBadge[]> {
  const memberIds = person.memberIds.filter((id): id is string => Boolean(id));
  const links = [
    ...(memberIds.length > 0 ? [{ memberId: { in: memberIds } }] : []),
    ...(person.userId ? [{ member: { userId: person.userId } }] : []),
  ];
  // Nothing to match on: an empty OR would match every listing, not none.
  if (links.length === 0) return [];

  try {
    return await db.teamMember.findMany({
      where: { isActive: true, OR: links },
      select: { type: true, position: true },
      orderBy: [{ type: "asc" }, { order: "asc" }],
    });
  } catch (err) {
    // A badge is a nicety; the dashboard must still load without it.
    console.error("[team-roles] could not load team roles", err);
    return [];
  }
}
