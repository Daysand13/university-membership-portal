import Link from "next/link";
import { KeyRound, MapPin } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { MemberProfileForm } from "@/components/forms/MemberProfileForm";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Account Settings" };
export const dynamic = "force-dynamic";

export default async function MemberAccountSettingsPage() {
  const member = await requireMember();

  return (
    <>
      <PortalPageHeader title="Account Settings" description="Keep your contact details up to date and manage how you sign in." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <DashboardCard id="contact-details" title="Contact Details" icon={<MapPin size={20} />}>
          <MemberProfileForm member={member} />
        </DashboardCard>

        <DashboardCard id="sign-in" title="Sign-in Details" icon={<KeyRound size={20} />}>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-slate">Index Number</dt>
              <dd className="font-data font-semibold text-primary-950 break-all">{member.indexNumber}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate">Email Address</dt>
              <dd className="font-semibold text-primary-950 break-all">{member.email}</dd>
            </div>
          </dl>
          <LinkButton href="/membership/dashboard/change-password" variant="outline" className="mt-5 w-full">
            Change Password
          </LinkButton>
          <p className="mt-4 text-sm text-slate">
            Your name, email address and academic details are managed by the association.{" "}
            <Link
              href="/contact?subject=Update%20to%20my%20membership%20record"
              className="font-semibold text-primary-800 hover:text-accent-600 underline"
            >
              Request a change
            </Link>
            .
          </p>
        </DashboardCard>
      </div>
    </>
  );
}
