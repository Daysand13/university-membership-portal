import { capabilitiesOf, requireAdminUser } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminUser();
  const capabilities = capabilitiesOf(admin);

  return (
    <div className="min-h-screen flex bg-surface-muted">
      <AdminSidebar capabilities={capabilities} />
      <div className="flex-1 min-w-0">
        <AdminHeader admin={admin} capabilities={[...capabilities]} />
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
