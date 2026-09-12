import Link from "next/link";
import { ArrowRight, Vote } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { getCurrentPublishedElection } from "@/lib/services/election-service";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { EmptyState } from "@/components/ui/Common";

export const metadata = { title: "Voting & Elections" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

function formatDate(date: Date | null): string {
  return date ? dateFormat.format(date) : "To be announced";
}

export default async function MemberElectionsPage() {
  await requireMember();
  const election = await getCurrentPublishedElection();

  return (
    <>
      <PortalPageHeader
        title="Voting & Elections"
        description="Everything you need to take part in choosing the association's leadership."
      />

      {!election ? (
        <EmptyState
          icon={<Vote size={28} aria-hidden="true" />}
          title="No election is open right now"
          description="When the next election is announced, its dates, candidates and voting details will appear here."
        />
      ) : (
        <div className="space-y-6">
          <DashboardCard id="election" title={election.title} icon={<Vote size={20} />} readAloud>
            {election.description && <p className="text-ink whitespace-pre-line">{election.description}</p>}
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-line p-4">
                <dt className="text-sm text-slate">Nominations</dt>
                <dd className="font-semibold text-primary-950 mt-1">
                  {formatDate(election.nominationStart)} – {formatDate(election.nominationEnd)}
                </dd>
              </div>
              <div className="rounded-lg border border-line p-4">
                <dt className="text-sm text-slate">Voting Date</dt>
                <dd className="font-semibold text-primary-950 mt-1">{formatDate(election.votingDate)}</dd>
              </div>
              <div className="rounded-lg border border-line p-4">
                <dt className="text-sm text-slate">How to Vote</dt>
                <dd className="font-semibold text-primary-950 mt-1">{election.venueOrMethod || "To be announced"}</dd>
              </div>
            </dl>
          </DashboardCard>

          {election.candidates.length > 0 && (
            <section aria-labelledby="candidates-heading" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
              <h2 id="candidates-heading" className="font-display font-bold text-lg text-primary-950 mb-4">
                Candidates
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {election.candidates.map((candidate) => (
                  <li key={candidate.id} className="flex gap-3.5 rounded-lg border border-line p-4">
                    <span className="w-14 h-14 rounded-full bg-primary-50 text-primary-800 overflow-hidden flex items-center justify-center shrink-0">
                      {candidate.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={candidate.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Vote size={20} aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-primary-950">{candidate.name}</p>
                      <p className="text-sm text-slate">{candidate.position}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {election.resultsSummary && (
            <section aria-labelledby="results-heading" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
              <h2 id="results-heading" className="font-display font-bold text-lg text-primary-950 mb-2">
                Results
              </h2>
              <p className="text-ink whitespace-pre-line">{election.resultsSummary}</p>
            </section>
          )}

          <p>
            <Link href="/elections" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600">
              Open the public elections page <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </p>
        </div>
      )}
    </>
  );
}
