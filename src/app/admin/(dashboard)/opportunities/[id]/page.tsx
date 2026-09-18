import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, CalendarClock, ChevronLeft, ExternalLink, Mail, MapPin } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getOpportunityForAdmin } from "@/lib/services/opportunity-service";
import { OpportunityReviewForm } from "@/components/admin/forms/ExecutiveForms";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OPPORTUNITY_STATUS_LABELS, opportunityTypeLabel } from "@/lib/portal-options";

export const metadata = { title: "Opportunity" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

export default async function AdminOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const { id } = await params;
  const posting = await getOpportunityForAdmin(id);
  if (!posting) notFound();

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/opportunities"
        className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4"
      >
        <ChevronLeft size={16} aria-hidden="true" /> Opportunity Board
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950 break-words">{posting.title}</h1>
        <StatusBadge status={posting.status} label={OPPORTUNITY_STATUS_LABELS[posting.status]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <section className="bg-white rounded-lg border border-line p-6">
          <p className="text-sm text-slate flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={14} aria-hidden="true" /> {posting.organization}
            </span>
            <span>{opportunityTypeLabel(posting.type)}</span>
            {posting.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" /> {posting.location}
              </span>
            )}
            {posting.closingDate && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={14} aria-hidden="true" /> Closes {dateFormat.format(posting.closingDate)}
              </span>
            )}
          </p>

          <p className="mt-4 whitespace-pre-line leading-relaxed text-ink">{posting.description}</p>

          <div className="mt-5 pt-4 border-t border-line space-y-2 text-sm">
            {posting.applyUrl && (
              <p className="break-all">
                <span className="text-slate">Apply at: </span>
                <a
                  href={posting.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600"
                >
                  <ExternalLink size={13} aria-hidden="true" /> {posting.applyUrl}
                </a>
              </p>
            )}
            {posting.applyEmail && (
              <p className="break-all">
                <span className="text-slate">Or by email: </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-primary-950">
                  <Mail size={13} aria-hidden="true" /> {posting.applyEmail}
                </span>
              </p>
            )}
            <p className="text-xs text-slate">
              Check the link before publishing — students will trust it because the association did.
            </p>
          </div>
        </section>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="font-display font-bold text-base text-primary-950 mb-3">Posted by</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate">Graduate</dt>
                <dd className="font-semibold text-primary-950">
                  {posting.alumni ? (
                    <Link href={`/admin/alumni/${posting.alumni.id}`} className="hover:text-accent-600">
                      {posting.alumni.fullName}
                    </Link>
                  ) : (
                    posting.postedByName
                  )}
                </dd>
              </div>
              {posting.alumni && (
                <>
                  <div>
                    <dt className="text-slate">Class</dt>
                    <dd className="text-primary-950">
                      {posting.alumni.programme}, {posting.alumni.graduationYear}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate">Email</dt>
                    <dd className="text-primary-950 break-words">{posting.alumni.email}</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-slate">Posted</dt>
                <dd className="text-primary-950">{dateFormat.format(posting.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="font-display font-bold text-base text-primary-950 mb-3">Review</h2>
            {posting.status === "PENDING" ? (
              <OpportunityReviewForm opportunityId={posting.id} />
            ) : (
              <p className="text-sm text-slate">
                {OPPORTUNITY_STATUS_LABELS[posting.status]}
                {posting.reviewedBy?.name && ` by ${posting.reviewedBy.name}`}
                {posting.reviewedAt && ` on ${dateFormat.format(posting.reviewedAt)}`}.
                {posting.reviewNote && <span className="block mt-1">&ldquo;{posting.reviewNote}&rdquo;</span>}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
