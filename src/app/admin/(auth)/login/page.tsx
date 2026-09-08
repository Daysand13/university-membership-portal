import { getSiteSettings } from "@/lib/services/content-service";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const settings = await getSiteSettings();
  return <AdminLoginForm siteTitle={settings.siteTitle} />;
}
