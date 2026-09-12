import { requireAlumni } from "@/lib/auth/alumni";
import { getCurrentMember } from "@/lib/auth/member";
import { getCurrentUser } from "@/lib/auth/user";
import { unifiedLogoutAction } from "@/lib/actions/auth-actions";
import { getSiteSettings } from "@/lib/services/content-service";
import { alumniHasMemberStanding } from "@/lib/services/dual-status-service";
import { PortalShell } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

/**
 * Frames the signed-in Alumni Portal pages. The public /alumni pages (the
 * showcase, login, registration, profiles) live in the (public) route group
 * and keep the public site's header instead.
 */
export default async function AlumniPortalLayout({ children }: { children: React.ReactNode }) {
  const alumni = await requireAlumni();

  const [settings, isDual, memberSide, session] = await Promise.all([
    getSiteSettings(),
    alumniHasMemberStanding(alumni),
    getCurrentMember(),
    getCurrentUser(),
  ]);

  return (
    <PortalShell
      mode="alumni"
      siteTitle={settings.siteTitle}
      logoUrl={settings.logoUrl}
      person={{ name: alumni.fullName, email: alumni.email, avatarUrl: alumni.profileImageUrl }}
      switcher={{
        isDual,
        canSwitch: memberSide !== null,
        isAdmin: session?.roles.includes("ADMIN") ?? false,
      }}
      signOutAction={unifiedLogoutAction}
    >
      {children}
    </PortalShell>
  );
}
