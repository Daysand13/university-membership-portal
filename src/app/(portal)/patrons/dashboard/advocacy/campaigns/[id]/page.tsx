import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Users } from "lucide-react";
import { requirePatron } from "@/lib/auth/patron";
import { getCampaign } from "@/lib/services/advocacy-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EndorseCampaignForm } from "@/components/patron-portal/AdvocacyForms";
import { campaignStatusLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "Campaign" };
export const dynamic = "force-dynamic";

export default async function PatronCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const patron = await requirePatron();
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const endorsed = campaign.endorsements.some((e) => e.patronId === patron.id);

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/patrons/dashboard/advocacy" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600">
        <ArrowLeft size={15} aria-hidden="true" /> Advocacy & Rights
      </Link>
      <PortalPageHeader
        title={campaign.title}
        description={
          <>
            <StatusBadge status={campaign.status} label={campaignStatusLabel(campaign.status)} />
            {campaign.initiatedBy && <> · Started by {campaign.initiatedBy}</>}
            {campaign.targetBody && <> · Addressed to {campaign.targetBody}</>}
          </>
        }
      />

      <section className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6 space-y-3">
        <p className="text-[17px] leading-relaxed text-ink">{campaign.summary}</p>
        {campaign.details && <p className="text-[15px] leading-relaxed text-ink whitespace-pre-line">{campaign.details}</p>}
      </section>

      <section aria-labelledby="endorse-heading" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
        <h2 id="endorse-heading" className="flex items-center gap-2 font-display font-bold text-lg text-primary-950 mb-3">
          <BadgeCheck size={20} aria-hidden="true" className="text-primary-800" /> Your Endorsement
        </h2>
        <EndorseCampaignForm campaignId={campaign.id} endorsed={endorsed} canEndorse={campaign.status === "ACTIVE"} />
      </section>

      <DashboardCard id="endorsers" title={`Endorsed by ${campaign.endorsements.length} Patron${campaign.endorsements.length === 1 ? "" : "s"}`} icon={<Users size={20} />}>
        {campaign.endorsements.length === 0 ? (
          <p className="text-slate">No patron has endorsed this campaign yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {campaign.endorsements.map((e) => (
              <li key={e.id} className="py-3 first:pt-0">
                <p className="font-semibold text-primary-950">
                  {[e.patron.title, e.patron.fullName].filter(Boolean).join(" ")}
                  {e.patronId === patron.id && <span className="text-sm font-normal text-slate"> (you)</span>}
                </p>
                <p className="text-sm text-slate">
                  {[e.patron.jobTitle, e.patron.organization].filter(Boolean).join(", ") || e.patron.occupation}
                </p>
                {e.comment && <p className="text-[15px] text-ink mt-1 italic">&ldquo;{e.comment}&rdquo;</p>}
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}
