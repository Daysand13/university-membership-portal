import { BadgeCheck, Scale } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { listCampaigns } from "@/lib/services/advocacy-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { EmptyState } from "@/components/ui/Common";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CoSignForm } from "@/components/alumni-portal/Forms";
import { campaignStatusLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "Advocacy Backing" };
export const dynamic = "force-dynamic";

/**
 * Campaigns the association is running, and the one thing a graduate can
 * add that nobody else can: their name as someone who studied here, came
 * through, and is still saying it isn't good enough.
 */
export default async function AlumniAdvocacyPage() {
  const alumni = await requireAlumni();
  const campaigns = await listCampaigns({ alumniId: alumni.id });

  return (
    <>
      <PortalPageHeader
        title="Advocacy Backing"
        description="Campaigns the executives are running with the university. Patrons endorse them with their standing; you co-sign as a graduate who has been through it."
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Scale size={28} aria-hidden="true" />}
          title="No campaigns are running"
          description="When the association takes something up with the university, it appears here for you to back."
        />
      ) : (
        <div className="space-y-6">
          {campaigns.map((campaign) => (
            <DashboardCard
              key={campaign.id}
              id={`campaign-${campaign.id}`}
              title={campaign.title}
              icon={<Scale size={20} />}
              readAloud
            >
              <p className="mb-3">
                <StatusBadge status={campaign.status} label={campaignStatusLabel(campaign.status)} />
                <span className="ml-2 text-sm text-slate">
                  {campaign.endorsementCount} signature{campaign.endorsementCount === 1 ? "" : "s"}
                  {campaign.initiatedBy && <> · started by {campaign.initiatedBy}</>}
                  {campaign.targetBody && <> · addressed to {campaign.targetBody}</>}
                </span>
              </p>

              <p className="text-[17px] leading-relaxed text-ink">{campaign.summary}</p>
              {campaign.details && (
                <p className="mt-3 text-[15px] leading-relaxed text-ink whitespace-pre-line">{campaign.details}</p>
              )}

              <div className="mt-5 pt-4 border-t border-line">
                <h3 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
                  <BadgeCheck size={18} aria-hidden="true" className="text-primary-800" /> Your signature
                </h3>
                <CoSignForm
                  campaignId={campaign.id}
                  signed={campaign.endorsedByMe}
                  open={campaign.status === "ACTIVE"}
                />
              </div>
            </DashboardCard>
          ))}
        </div>
      )}
    </>
  );
}
