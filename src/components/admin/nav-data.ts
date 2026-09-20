import {
  LayoutDashboard,
  Newspaper,
  CalendarDays,
  Info,
  Vote,
  HandHeart,
  BookOpen,
  Users,
  ClipboardList,
  Wallet,
  Mail,
  Image as ImageIcon,
  GalleryHorizontal,
  Share2,
  Settings,
  ScrollText,
  GraduationCap,
  UserCog,
  School,
  Accessibility,
  Award,
  Landmark,
  Scale,
  LifeBuoy,
  BriefcaseBusiness,
  Radio,
  Handshake,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  /**
   * The capability the page behind this link needs. Omitted means every
   * administrator can open it. This only decides what is SHOWN — the page
   * itself checks the same capability, so a hidden link is never what keeps
   * anybody out.
   */
  capability?: string;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  { title: "", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Content",
    items: [
      { href: "/admin/hero-slides", label: "Hero Slides", icon: GalleryHorizontal, capability: "content.hero" },
      { href: "/admin/team", label: "Leadership", icon: Users, capability: "content.team" },
      { href: "/admin/news", label: "News", icon: Newspaper, capability: "content.news" },
      { href: "/admin/events", label: "Events", icon: CalendarDays, capability: "content.events" },
      { href: "/admin/about", label: "About Us", icon: Info, capability: "content.about" },
      { href: "/admin/elections", label: "Elections", icon: Vote, capability: "elections.manage" },
      { href: "/admin/donate", label: "Donate", icon: HandHeart, capability: "content.donate" },
    ],
  },
  {
    title: "Membership",
    items: [
      {
        href: "/admin/membership-applications",
        label: "Applications",
        icon: ClipboardList,
        capability: "members.applications",
      },
      { href: "/admin/members", label: "Members", icon: Users, capability: "members.records" },
      {
        href: "/admin/academic-options",
        label: "Departments & Programmes",
        icon: School,
        capability: "members.academic",
      },
      {
        href: "/admin/special-needs-categories",
        label: "Special Needs Categories",
        icon: Accessibility,
        capability: "members.academic",
      },
      { href: "/admin/dues", label: "Dues", icon: Wallet, capability: "finance.dues" },
      { href: "/admin/finance", label: "Finance", icon: Landmark, capability: "finance.ledger" },
      { href: "/admin/alumni", label: "Alumni", icon: GraduationCap, capability: "members.alumni" },
      { href: "/admin/patrons", label: "Patrons", icon: Award, capability: "members.patrons" },
      { href: "/admin/users", label: "User Status Matrix", icon: UserCog, capability: "members.accounts" },
    ],
  },
  {
    title: "Student Support",
    items: [
      { href: "/admin/advocacy", label: "Escalation Desk", icon: Scale, capability: "support.barriers" },
      {
        href: "/admin/support-requests",
        label: "Support Requests",
        icon: LifeBuoy,
        capability: "support.requests",
      },
      {
        href: "/admin/opportunities",
        label: "Opportunity Board",
        icon: BriefcaseBusiness,
        capability: "support.opportunities",
      },
    ],
  },
  {
    title: "Outreach",
    items: [
      {
        href: "/admin/allies",
        label: "Allies & Champions",
        icon: Handshake,
        capability: "outreach.allies",
      },
      {
        href: "/admin/assistive-tech",
        label: "Assistive Software",
        icon: MonitorSmartphone,
        capability: "outreach.software",
      },
    ],
  },
  {
    title: "Library",
    items: [{ href: "/admin/library", label: "Documents", icon: BookOpen, capability: "library.documents" }],
  },
  {
    title: "Messages",
    items: [
      { href: "/admin/broadcasts", label: "Broadcasts", icon: Radio, capability: "messages.broadcasts" },
      { href: "/admin/contact-messages", label: "Contact Messages", icon: Mail, capability: "messages.contact" },
    ],
  },
  {
    title: "Media & Site",
    items: [
      { href: "/admin/media", label: "Media Library", icon: ImageIcon, capability: "content.media" },
      { href: "/admin/social-links", label: "Social Links", icon: Share2, capability: "content.social" },
      { href: "/admin/permissions", label: "Executive Permissions", icon: ShieldCheck, capability: "site.permissions" },
      { href: "/admin/settings", label: "Settings", icon: Settings, capability: "site.settings" },
      { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText, capability: "site.audit" },
      { href: "/admin/email-logs", label: "Email Logs", icon: Mail, capability: "site.emails" },
    ],
  },
];
