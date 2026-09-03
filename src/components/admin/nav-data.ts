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
  Mail,
  Image as ImageIcon,
  GalleryHorizontal,
  Share2,
  Settings,
  ScrollText,
} from "lucide-react";
import { AdminRole } from "@/generated/prisma/enums";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  roles?: AdminRole[];
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
      { href: "/admin/hero-slides", label: "Hero Slides", icon: GalleryHorizontal, roles: [AdminRole.EDITOR] },
      { href: "/admin/team", label: "Leadership & Patrons", icon: Users, roles: [AdminRole.EDITOR] },
      { href: "/admin/news", label: "News", icon: Newspaper, roles: [AdminRole.EDITOR] },
      { href: "/admin/events", label: "Events", icon: CalendarDays, roles: [AdminRole.EDITOR] },
      { href: "/admin/about", label: "About Us", icon: Info, roles: [AdminRole.EDITOR] },
      { href: "/admin/elections", label: "Elections", icon: Vote, roles: [AdminRole.ELECTION_OFFICER] },
      { href: "/admin/donate", label: "Donate", icon: HandHeart, roles: [AdminRole.EDITOR] },
    ],
  },
  {
    title: "Membership",
    items: [
      {
        href: "/admin/membership-applications",
        label: "Applications",
        icon: ClipboardList,
        roles: [AdminRole.MEMBERSHIP_OFFICER],
      },
      { href: "/admin/members", label: "Members", icon: Users, roles: [AdminRole.MEMBERSHIP_OFFICER] },
    ],
  },
  {
    title: "Library",
    items: [{ href: "/admin/library", label: "Documents", icon: BookOpen, roles: [AdminRole.LIBRARIAN] }],
  },
  {
    title: "Messages",
    items: [{ href: "/admin/contact-messages", label: "Contact Messages", icon: Mail }],
  },
  {
    title: "Media & Site",
    items: [
      { href: "/admin/media", label: "Media Library", icon: ImageIcon },
      { href: "/admin/social-links", label: "Social Links", icon: Share2 },
      { href: "/admin/settings", label: "Settings", icon: Settings, roles: [AdminRole.SUPER_ADMIN] },
      { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText, roles: [AdminRole.SUPER_ADMIN] },
      { href: "/admin/email-logs", label: "Email Logs", icon: Mail, roles: [AdminRole.SUPER_ADMIN] },
    ],
  },
];
