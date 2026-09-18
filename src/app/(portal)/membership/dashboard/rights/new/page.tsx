import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { BarrierReportForm } from "@/components/student-portal/Forms";

export const metadata = { title: "Report a Barrier" };
export const dynamic = "force-dynamic";

export default async function NewBarrierReportPage() {
  await requireMember();

  return (
    <div className="max-w-3xl">
      <Link
        href="/membership/dashboard/rights"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
      >
        <ArrowLeft size={15} aria-hidden="true" /> My Rights & Advocacy
      </Link>
      <PortalPageHeader
        title="Report a Barrier"
        description="Take as long as you need. Nothing here is shared with other students, and nothing about your health or your support needs is asked for."
      />
      <DashboardCard id="report-form" title="What happened" icon={<Scale size={20} />}>
        <BarrierReportForm />
      </DashboardCard>
    </div>
  );
}
