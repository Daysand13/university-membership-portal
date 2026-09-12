/**
 * The sidebar for each portal. Plain data (icons as names, not components)
 * so the server-rendered shell can hand it to the client-side nav, which
 * needs the current path to mark the active item.
 */

export type PortalMode = "member" | "alumni";

export type PortalIconName =
  | "dashboard"
  | "academic"
  | "dues"
  | "events"
  | "elections"
  | "settings"
  | "directory"
  | "network"
  | "career"
  | "records"
  | "further";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: PortalIconName;
  /** Active only on this exact path (for the dashboard home). */
  exact?: boolean;
  /** Other paths that should also highlight this item. */
  alsoActiveOn?: string[];
}

export const PORTAL_LABEL: Record<PortalMode, string> = {
  member: "Student Portal",
  alumni: "Alumni Portal",
};

export const PORTAL_HOME: Record<PortalMode, string> = {
  member: "/membership/dashboard",
  alumni: "/alumni/dashboard",
};

export const PORTAL_NAV: Record<PortalMode, PortalNavItem[]> = {
  member: [
    { href: "/membership/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/membership/dashboard/academic", label: "Course & Department", icon: "academic" },
    { href: "/membership/dashboard/dues", label: "Dues & Payments", icon: "dues" },
    { href: "/membership/dashboard/events", label: "Association Events", icon: "events" },
    { href: "/membership/dashboard/elections", label: "Voting & Elections", icon: "elections" },
    {
      href: "/membership/dashboard/profile",
      label: "Account Settings",
      icon: "settings",
      alsoActiveOn: ["/membership/dashboard/change-password"],
    },
  ],
  alumni: [
    { href: "/alumni/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/alumni/directory", label: "Alumni Directory", icon: "directory" },
    { href: "/alumni/mentorship", label: "Networking & Mentorship", icon: "network" },
    { href: "/alumni/career", label: "Career Updates", icon: "career" },
    { href: "/alumni/records", label: "Academic Records", icon: "records" },
    { href: "/alumni/further-studies", label: "Register for Further Studies", icon: "further" },
    { href: "/alumni/events", label: "Events & Reunions", icon: "events" },
    { href: "/alumni/profile", label: "Account Settings", icon: "settings" },
  ],
};

export function isNavItemActive(item: PortalNavItem, pathname: string): boolean {
  if (item.alsoActiveOn?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
