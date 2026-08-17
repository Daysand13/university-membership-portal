"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AdminRole } from "@/generated/prisma/enums";
import { ADMIN_NAV } from "./nav-data";

export function AdminMobileNav({ role }: { role: AdminRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open admin menu"
        onClick={() => setOpen(true)}
        className="p-2 rounded-md text-slate hover:bg-surface-muted"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button aria-label="Close menu" className="absolute inset-0 bg-primary-950/50" onClick={() => setOpen(false)} />
          <nav className="relative w-72 max-w-[85%] h-full bg-primary-950 text-primary-100 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="font-display font-bold text-white text-sm">Admin Menu</span>
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-1 text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-3">
              {ADMIN_NAV.map((group) => {
                const items = group.items.filter(
                  (item) => !item.roles || role === AdminRole.SUPER_ADMIN || item.roles.includes(role),
                );
                if (items.length === 0) return null;
                return (
                  <div key={group.title || "root"} className="mb-4">
                    {group.title && (
                      <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary-400">
                        {group.title}
                      </p>
                    )}
                    {items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-white/10"
                      >
                        <item.icon size={16} />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
