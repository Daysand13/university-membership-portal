import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Printer, Trash2 } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getCampaign } from "@/lib/services/advocacy-service";
import { deleteCampaignAction } from "@/lib/actions/patron-admin-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { CampaignForm } from "@/components/admin/forms/AdvocacyForms";

export const metadata = { title: "Campaign" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("members.patrons");
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  return (
    <div className="max-w-5xl">
      <Link href="/admin/patrons/advocacy" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Advocacy
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">{campaign.title}</h1>
        <ConfirmButton
          action={deleteCampaignAction.bind(null, campaign.id)}
          confirmMessage="Delete this campaign and all its endorsements? This can't be undone."
          className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-light"
        >
          <Trash2 size={14} aria-hidden="true" /> Delete
        </ConfirmButton>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <section className="bg-white rounded-lg border border-line p-6">
          <CampaignForm
            campaign={{
              id: campaign.id,
              title: campaign.title,
              summary: campaign.summary,
              details: campaign.details,
              initiatedBy: campaign.initiatedBy,
              targetBody: campaign.targetBody,
              status: campaign.status,
            }}
          />
        </section>

        <section className="bg-white rounded-lg border border-line p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-display font-bold text-base text-primary-950">
              Endorsements ({campaign.endorsements.length})
            </h2>
            {campaign.endorsements.length > 0 && (
              <Link
                href={`/admin/endorsement-sheet/${campaign.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
              >
                <Printer size={15} aria-hidden="true" /> Endorsement sheet
              </Link>
            )}
          </div>
          {campaign.endorsements.length === 0 ? (
            <p className="text-sm text-slate">Nobody has signed this campaign yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {campaign.endorsements.map((e) => (
                <li key={e.id} className="py-3">
                  {e.patron ? (
                    <Link href={`/admin/patrons/${e.patronId}`} className="font-semibold text-primary-950 hover:text-accent-600">
                      {[e.patron.title, e.patron.fullName].filter(Boolean).join(" ")}
                    </Link>
                  ) : e.alumni ? (
                    <Link href={`/admin/alumni/${e.alumniId}`} className="font-semibold text-primary-950 hover:text-accent-600">
                      {e.alumni.fullName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-primary-950">Former supporter</span>
                  )}
                  <p className="text-xs text-slate">
                    {e.patron
                      ? [e.patron.jobTitle, e.patron.organization].filter(Boolean).join(", ") || e.patron.occupation
                      : e.alumni
                        ? `Alumnus · Class of ${e.alumni.graduationYear}`
                        : ""}{" "}
                    · {dateFormat.format(e.createdAt)}
                  </p>
                  {e.comment && <p className="text-sm text-ink mt-1 italic">&ldquo;{e.comment}&rdquo;</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
