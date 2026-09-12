import { Briefcase } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { AlumniCareerForm } from "@/components/forms/AlumniCareerForm";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";

export const metadata = { title: "Career Updates" };
export const dynamic = "force-dynamic";

export default async function AlumniCareerPage() {
  const alumni = await requireAlumni();

  return (
    <>
      <PortalPageHeader
        title="Career Updates"
        description="Tell fellow graduates what you're doing now. Your profession and location show in the Alumni Directory to other signed-in alumni; your role, organisation and links appear on a public profile only if the association has made yours public."
      />
      <div className="max-w-3xl">
        <DashboardCard id="career-details" title="Your Career Details" icon={<Briefcase size={20} />}>
          <AlumniCareerForm alumni={alumni} />
        </DashboardCard>
      </div>
    </>
  );
}
