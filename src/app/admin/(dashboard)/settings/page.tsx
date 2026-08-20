import { SiteSettingsForm } from "@/components/admin/forms/SiteSettingsForm";
import { AdminChangePasswordForm } from "@/components/admin/forms/AdminChangePasswordForm";
import { AdminNameForm } from "@/components/admin/forms/AdminNameForm";
import { AdminEmailForm } from "@/components/admin/forms/AdminEmailForm";
import { getSiteSettings } from "@/lib/services/content-service";
import { requireAdminUser } from "@/lib/auth/admin";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [settings, admin] = await Promise.all([getSiteSettings(), requireAdminUser()]);
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Settings</h1>
        <p className="text-sm text-slate mt-1">Site-wide branding and contact information.</p>
      </div>

      <div className="bg-white rounded-lg border border-line p-6 sm:p-7 mb-6 space-y-8">
        <h2 className="text-sm font-semibold text-primary-950">Your Account</h2>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-light mb-3">Display Name</p>
          <AdminNameForm currentName={admin.name} />
        </div>
        <div className="pt-6 border-t border-line">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-light mb-3">Email Address</p>
          <AdminEmailForm currentEmail={admin.email} />
        </div>
        <div className="pt-6 border-t border-line">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-light mb-3">Password</p>
          <AdminChangePasswordForm />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line p-6 sm:p-7">
        <SiteSettingsForm settings={settings} />
      </div>
    </div>
  );
}
