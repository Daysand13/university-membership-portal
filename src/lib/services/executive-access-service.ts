import "server-only";
import { db } from "@/lib/db";
import { effectiveCapabilities, parsePermissionMask } from "@/lib/auth/capabilities";

/**
 * The administrator account behind an executive's leadership listing.
 *
 * A listing is who the association says someone is; an admin account is
 * what the portal lets them do. They are separate records — somebody can
 * be listed without ever signing in, and an administrator need not be an
 * executive at all — so this works out which account, if any, belongs to
 * the person in a listing, and makes both editable in the one place the
 * listing is edited.
 *
 * The link is the shared user account where there is one, and the email
 * address otherwise, which is how an account created before the unified
 * account model still resolves.
 */
export async function getExecutiveAccess(teamMemberId: string) {
  const listing = await db.teamMember.findUnique({
    where: { id: teamMemberId },
    include: {
      member: {
        select: { id: true, firstName: true, middleName: true, lastName: true, email: true, userId: true },
      },
    },
  });
  if (!listing) return null;

  const member = listing.member;
  const admin =
    (member?.userId ? await db.adminUser.findUnique({ where: { userId: member.userId } }) : null) ??
    (member?.email ? await db.adminUser.findUnique({ where: { email: member.email } }) : null);

  return {
    listing: { id: listing.id, name: listing.name, position: listing.position },
    member,
    admin: admin
      ? {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
          lastLoginAt: admin.lastLoginAt,
          overrides: parsePermissionMask(admin.permissionMask),
          capabilities: [...effectiveCapabilities(admin.role, admin.permissionMask)],
        }
      : null,
  };
}

export type ExecutiveAccess = NonNullable<Awaited<ReturnType<typeof getExecutiveAccess>>>;

/** Admin accounts that aren't behind any leadership listing, for the other list. */
export async function listAdminAccountsWithoutListing() {
  const [admins, listings] = await Promise.all([
    db.adminUser.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, userId: true },
    }),
    db.teamMember.findMany({
      where: { type: "LEADERSHIP", memberId: { not: null } },
      select: { id: true, name: true, member: { select: { email: true, userId: true } } },
    }),
  ]);

  const linkedEmails = new Set(listings.map((l) => l.member?.email).filter(Boolean));
  const linkedUserIds = new Set(listings.map((l) => l.member?.userId).filter(Boolean));
  return admins.filter((admin) => !linkedEmails.has(admin.email) && !(admin.userId && linkedUserIds.has(admin.userId)));
}

export type ListingAccess = { status: "none" | "pending" | "active" | "deactivated"; role: string } | null;

/**
 * Who among the listed executives has portal access, in one query — for
 * the Leadership list, where a column says so at a glance.
 */
export async function describeListingAccess(
  listings: { id: string; member: { email: string; userId: string | null } | null }[],
): Promise<Map<string, ListingAccess>> {
  const emails = listings.map((l) => l.member?.email).filter((e): e is string => Boolean(e));
  const userIds = listings.map((l) => l.member?.userId).filter((u): u is string => Boolean(u));
  const admins =
    emails.length || userIds.length
      ? await db.adminUser.findMany({
          where: { OR: [{ email: { in: emails } }, { userId: { in: userIds } }] },
          select: { email: true, userId: true, role: true, isActive: true, lastLoginAt: true },
        })
      : [];

  const byEmail = new Map(admins.map((a) => [a.email, a]));
  const byUserId = new Map(admins.filter((a) => a.userId).map((a) => [a.userId!, a]));

  return new Map(
    listings.map((listing) => {
      const admin =
        (listing.member?.userId ? byUserId.get(listing.member.userId) : undefined) ??
        (listing.member?.email ? byEmail.get(listing.member.email) : undefined);
      if (!admin) return [listing.id, null];
      const status = !admin.isActive ? "deactivated" : admin.lastLoginAt ? "active" : "pending";
      return [listing.id, { status, role: admin.role }];
    }),
  );
}
