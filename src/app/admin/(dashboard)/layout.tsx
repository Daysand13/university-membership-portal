import { requireAdminUser } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminUser();

  return (
    <div className="min-h-screen flex bg-surface-muted">
      <AdminSidebar role={admin.role} />
      <div className="flex-1 min-w-0">
        <AdminHeader admin={admin} />
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
