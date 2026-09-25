/**
 * The sidebar for each portal. Plain data (icons as names, not components)
 * so the server-rendered shell can hand it to the client-side nav, which
 * needs the current path to mark the active item.
 */

export type PortalMode = "member" | "alumni" | "patron";

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
  | "further"
  | "finances"
  | "messages"
  | "advocacy"
  | "documents"
  | "announcements"
  | "support"
  | "mentorship"
  | "jobs";

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
  patron: "Patrons' Portal",
};

export const PORTAL_HOME: Record<PortalMode, string> = {
  member: "/membership/dashboard",
  alumni: "/alumni/dashboard",
  patron: "/patrons/dashboard",
};

export const PORTAL_NAV: Record<PortalMode, PortalNavItem[]> = {
  member: [
    { href: "/membership/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/membership/dashboard/rights", label: "My Rights & Advocacy", icon: "advocacy" },
    { href: "/membership/dashboard/support", label: "Support & Assistance", icon: "support" },
    {
      href: "/membership/dashboard/academic",
      label: "Academic & Study Groups",
      icon: "academic",
      alsoActiveOn: ["/membership/dashboard/study-groups"],
    },
    { href: "/membership/dashboard/mentorship", label: "Mentorship & Alumni", icon: "mentorship" },
    { href: "/membership/dashboard/dues", label: "Dues & Payments", icon: "dues" },
    { href: "/membership/dashboard/id-card", label: "My ID Card", icon: "records" },
    {
      href: "/membership/dashboard/cv",
      label: "My CV",
      icon: "documents",
      alsoActiveOn: ["/membership/dashboard/cv/paid"],
    },
    { href: "/membership/dashboard/letters", label: "My Letters", icon: "messages" },
    { href: "/membership/dashboard/events", label: "Association Events", icon: "events" },
    { href: "/membership/dashboard/elections", label: "Voting & Elections", icon: "elections" },
    { href: "/membership/dashboard/announcements", label: "Announcements", icon: "announcements" },
    {
      href: "/membership/dashboard/profile",
      label: "Account Settings",
      icon: "settings",
      alsoActiveOn: ["/membership/dashboard/change-password"],
    },
  ],
  alumni: [
    { href: "/alumni/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/alumni/mentorship", label: "Mentorship Centre", icon: "mentorship" },
    { href: "/alumni/giving", label: "Donations & Giving", icon: "finances" },
    { href: "/alumni/opportunities", label: "Opportunity Board", icon: "jobs" },
    { href: "/alumni/advocacy", label: "Advocacy Backing", icon: "advocacy" },
    { href: "/alumni/directory", label: "Alumni Directory", icon: "directory" },
    { href: "/alumni/career", label: "Career Updates", icon: "career" },
    { href: "/alumni/cv", label: "My CV", icon: "documents", alsoActiveOn: ["/alumni/cv/paid"] },
    { href: "/alumni/records", label: "Academic Records", icon: "records" },
    { href: "/alumni/further-studies", label: "Register for Further Studies", icon: "further" },
    { href: "/alumni/events", label: "Events & Reunions", icon: "events" },
    { href: "/alumni/announcements", label: "Announcements", icon: "announcements" },
    { href: "/alumni/profile", label: "Account Settings", icon: "settings" },
  ],
  patron: [
    { href: "/patrons/dashboard", label: "Overview", icon: "dashboard", exact: true },
    { href: "/patrons/dashboard/finances", label: "Finances & Support", icon: "finances" },
    { href: "/patrons/dashboard/messages", label: "Communication Center", icon: "messages" },
    { href: "/patrons/dashboard/advocacy", label: "Advocacy & Rights", icon: "advocacy" },
    { href: "/patrons/dashboard/membership", label: "Membership Network", icon: "network" },
    { href: "/patrons/dashboard/documents", label: "Governance & Documents", icon: "documents" },
    { href: "/patrons/dashboard/events", label: "Association Events", icon: "events" },
    { href: "/patrons/dashboard/account", label: "Account Settings", icon: "settings" },
  ],
};

export function isNavItemActive(item: PortalNavItem, pathname: string): boolean {
  if (item.alsoActiveOn?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
