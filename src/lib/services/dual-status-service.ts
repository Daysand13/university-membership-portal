import "server-only";
import { db } from "@/lib/db";

/**
 * Whether the signed-in person holds BOTH standings — student and graduate.
 *
 * Derived from the records themselves rather than from the session, and
 * that distinction is the whole point. The dashboards used to read this off
 * the unified session's roles, which meant it only ever appeared for people
 * who had come through the unified /login. Anyone signed in via
 * /membership/login or the alumni login holds a legacy member_session or
 * alumni_session, and those carry no roles — so a genuinely dual member saw
 * nothing at all. Reading the records instead makes the answer the same
 * however someone logged in, and keeps working for every future dual member
 * without anyone having to remember this.
 *
 * Two links are checked because there are two ways a person's standings get
 * tied together: a shared User row (how the identity system does it now),
 * and AlumniProfile.sourceMemberId (set when a member is promoted to alumni
 * or granted dual standing). Either one is enough.
 *
 * Only ACTIVE counterparts count, matching how getCurrentUser filters roles
 * — someone suspended on one side shouldn't be invited to switch to it.
 */
export async function memberHasAlumniStanding(member: {
  id: string;
  userId: string | null;
}): Promise<boolean> {
  const links = [
    ...(member.userId ? [{ userId: member.userId }] : []),
    { sourceMemberId: member.id },
  ];

  const alumni = await db.alumniProfile.findFirst({
    where: { status: "ACTIVE", OR: links },
    select: { id: true },
  });
  return alumni !== null;
}

export async function alumniHasMemberStanding(alumni: {
  id: string;
  userId: string | null;
  sourceMemberId: string | null;
}): Promise<boolean> {
  const links = [
    ...(alumni.userId ? [{ userId: alumni.userId }] : []),
    ...(alumni.sourceMemberId ? [{ id: alumni.sourceMemberId }] : []),
  ];
  // Nothing to match on: an alumnus with neither link cannot be dual, and an
  // empty OR would match every member rather than none.
  if (links.length === 0) return false;

  const member = await db.member.findFirst({
    where: { status: "ACTIVE", OR: links },
    select: { id: true },
  });
  return member !== null;
}
