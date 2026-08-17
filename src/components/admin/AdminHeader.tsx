import { LogOut } from "lucide-react";
import { adminLogoutAction } from "@/lib/actions/auth-actions";
import { AdminMobileNav } from "./AdminMobileNav";
import { NotificationBell } from "./NotificationBell";
import { listRecentNotifications, getUnreadNotificationCount } from "@/lib/services/notification-service";
import type { AdminUser } from "@/generated/prisma/client";

export async function AdminHeader({ admin }: { admin: AdminUser }) {
  const [notifications, unreadCount] = await Promise.all([
    listRecentNotifications(8),
    getUnreadNotificationCount(),
  ]);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-line">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        <AdminMobileNav role={admin.role} />
        <div className="hidden lg:block" />

        <div className="flex items-center gap-1.5">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          <div className="w-px h-6 bg-line mx-1.5" />
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-primary-950 leading-tight">{admin.name}</p>
            <p className="text-xs text-slate-light leading-tight">{admin.role.replace(/_/g, " ")}</p>
          </div>
          <form action={adminLogoutAction}>
            <button
              type="submit"
              aria-label="Log out"
              className="p-2.5 rounded-md text-slate hover:bg-surface-muted hover:text-danger transition-colors"
            >
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
