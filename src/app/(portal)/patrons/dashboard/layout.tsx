import { requirePatron } from "@/lib/auth/patron";
import { patronLogoutAction } from "@/lib/actions/patron-actions";
import { getSiteSettings } from "@/lib/services/content-service";
import { getPatronNotifications } from "@/lib/services/patron-insights-service";
import { PortalShell } from "@/components/portal/PortalShell";
import { PatronTopBarTools } from "@/components/patron-portal/PatronTopBarTools";

export const dynamic = "force-dynamic";

/** Frames the signed-in Patrons' Portal pages, like the student and alumni portals. */
export default async function PatronPortalLayout({ children }: { children: React.ReactNode }) {
  const patron = await requirePatron();
  const [settings, notifications] = await Promise.all([getSiteSettings(), getPatronNotifications(patron)]);

  return (
    <PortalShell
      mode="patron"
      siteTitle={settings.siteTitle}
      logoUrl={settings.logoUrl}
      person={{
        name: [patron.title, patron.fullName].filter(Boolean).join(" "),
        email: patron.email,
        avatarUrl: null,
      }}
      // Patrons hold no student or alumni standing, so there's nothing to switch to.
      switcher={{ isDual: false, canSwitch: false, isAdmin: false }}
      signOutAction={patronLogoutAction}
      headerTools={
        <PatronTopBarTools
          notifications={notifications.items.map((item) => ({ ...item, at: item.at.toISOString() }))}
          unreadCount={notifications.unreadCount}
        />
      }
    >
      {children}
    </PortalShell>
  );
}
