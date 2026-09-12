import { KeyRound, UserRound } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { AlumniProfileForm } from "@/components/forms/AlumniProfileForm";
import { AlumniChangePasswordForm } from "@/components/forms/AlumniChangePasswordForm";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";

export const metadata = { title: "Account Settings" };
export const dynamic = "force-dynamic";

export default async function AlumniProfilePage() {
  const alumni = await requireAlumni();

  return (
    <>
      <PortalPageHeader
        title="Account Settings"
        description="Your personal details, how you appear to fellow alumni, and your password."
      />

      <div className="space-y-6 max-w-3xl">
        <DashboardCard id="profile-details" title="Profile & Contact Details" icon={<UserRound size={20} />}>
          <AlumniProfileForm alumni={alumni} />
        </DashboardCard>

        {/* Anchor target for "Change Password" in the account menu. */}
        <div id="password" className="scroll-mt-24">
          <DashboardCard id="change-password" title="Change Password" icon={<KeyRound size={20} />}>
            <p className="text-slate mb-4">Choose a strong, unique password you don&apos;t use anywhere else.</p>
            <AlumniChangePasswordForm />
          </DashboardCard>
        </div>
      </div>
    </>
  );
}
