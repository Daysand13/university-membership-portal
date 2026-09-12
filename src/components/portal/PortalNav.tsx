"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Search,
  Settings,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { isNavItemActive, type PortalIconName, type PortalNavItem } from "./portal-nav-items";

const ICONS: Record<PortalIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  academic: BookOpen,
  dues: CreditCard,
  events: CalendarDays,
  elections: Vote,
  settings: Settings,
  directory: Search,
  network: Users,
  career: Briefcase,
  records: FileText,
  further: GraduationCap,
};

export function PortalNav({ items, label }: { items: PortalNavItem[]; label: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isNavItemActive(item, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-11 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                  active
                    ? "bg-primary-800 text-white"
                    : "text-primary-950 hover:bg-line"
                }`}
              >
                <Icon size={18} aria-hidden="true" className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
