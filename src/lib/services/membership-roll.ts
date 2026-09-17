import type { Prisma } from "@/generated/prisma/client";

/**
 * Who is currently ON THE MEMBERSHIP ROLL: every member who hasn't
 * graduated. Graduation (promoteMemberToAlumni) is what ends membership and
 * moves the person to the Alumni pages, so `graduatedAt` — not "has an
 * alumni profile" — is what the roll turns on.
 *
 * The difference is a real person, in both directions. An alumnus who
 * enrols again through the further-studies flow gets a NEW member record
 * that carries their alumni profile's link (AlumniProfile.sourceMemberId
 * moves to it — see approveApplication): they are an enrolled student and
 * belong on the roll, though the old "has no alumni profile" rule dropped
 * them from the Members list, the Total Members card and the dues register.
 * That same move leaves their FIRST, graduated member record without an
 * alumni profile, and the old rule then counted that finished record as a
 * current member. This rule is right about both.
 *
 * It lives in its own file, with no other imports, because the admin
 * listings, the dues register and the Patrons' Portal figures all need it —
 * and importing one of those services into another would make a cycle.
 */
export const ON_THE_ROLL: Prisma.MemberWhereInput = { graduatedAt: null };

/** On the roll and not suspended: the members who are actively enrolled. */
export const ENROLLED_STUDENT: Prisma.MemberWhereInput = { ...ON_THE_ROLL, status: "ACTIVE" };
