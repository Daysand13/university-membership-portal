import { SiteSettingsForm } from "@/components/admin/forms/SiteSettingsForm";
import { getSiteSettings } from "@/lib/services/content-service";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Settings</h1>
        <p className="text-sm text-slate mt-1">Site-wide branding and contact information.</p>
      </div>
      <div className="bg-white rounded-lg border border-line p-6 sm:p-7">
        <SiteSettingsForm settings={settings} />
      </div>
    </div>
  );
}
