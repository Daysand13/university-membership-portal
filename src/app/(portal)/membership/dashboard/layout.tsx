import { requireMember } from "@/lib/auth/member";
import { getCurrentAlumni } from "@/lib/auth/alumni";
import { getCurrentUser } from "@/lib/auth/user";
import { unifiedLogoutAction } from "@/lib/actions/auth-actions";
import { getSiteSettings } from "@/lib/services/content-service";
import { memberHasAlumniStanding } from "@/lib/services/dual-status-service";
import { PortalShell } from "@/components/portal/PortalShell";
import { formatFullName } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();

  const [settings, isDual, alumniSide, session] = await Promise.all([
    getSiteSettings(),
    // From the records, not the session — so dual status shows however the
    // person signed in (see dual-status-service.ts).
    memberHasAlumniStanding(member),
    // Whether the alumni side opens with the cookies this person already
    // holds, which decides where the switcher can take them.
    getCurrentAlumni(),
    getCurrentUser(),
  ]);

  return (
    <PortalShell
      mode="member"
      siteTitle={settings.siteTitle}
      logoUrl={settings.logoUrl}
      person={{
        name: formatFullName(member.firstName, member.middleName, member.lastName),
        email: member.email,
        avatarUrl: member.profileImageUrl,
      }}
      switcher={{
        isDual,
        canSwitch: alumniSide !== null,
        isAdmin: session?.roles.includes("ADMIN") ?? false,
      }}
      // Clears every session kind, so signing out of one portal can't leave
      // the person still signed in to the other.
      signOutAction={unifiedLogoutAction}
    >
      {children}
    </PortalShell>
  );
}
