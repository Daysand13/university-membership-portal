import Link from "next/link";
import { AdminRole } from "@/generated/prisma/client";
import { Logo } from "@/components/layout/Logo";
import { ADMIN_NAV } from "./nav-data";

function canSee(item: { roles?: AdminRole[] }, role: AdminRole): boolean {
  if (!item.roles) return true;
  if (role === AdminRole.SUPER_ADMIN) return true;
  return item.roles.includes(role);
}

export function AdminSidebar({ role }: { role: AdminRole }) {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-primary-950 text-primary-100 min-h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-white/10">
        <Logo siteTitle="Admin CMS" onDark />
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {ADMIN_NAV.map((group) => {
          const visibleItems = group.items.filter((item) => canSee(item, role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.title || "root"} className="mb-5">
              {group.title && (
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-400">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-primary-100 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <item.icon size={16} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-white/10">
        <Link href="/" className="text-xs text-primary-300 hover:text-white">
          ← Back to public site
        </Link>
      </div>
    </aside>
  );
}
