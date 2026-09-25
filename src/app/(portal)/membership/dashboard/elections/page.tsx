import Link from "next/link";
import { ArrowRight, BadgeCheck, CheckCircle2, Vote } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { db } from "@/lib/db";
import {
  getBallotPaper,
  getCurrentPublishedElection,
  getMemberCandidacy,
} from "@/lib/services/election-service";
import { getCurrentAcademicYear, hasPaidDuesForYear } from "@/lib/services/dues-service";
import { formatCedis, hasPaidFor } from "@/lib/services/document-purchase-service";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { NominationForm } from "@/components/portal/NominationForm";
import { EmptyState } from "@/components/ui/Common";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PHASE_LABELS, effectivePhase } from "@/lib/election-status";

export const metadata = { title: "Voting & Elections" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

const dateTime = new Intl.DateTimeFormat("en-GH", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Africa/Accra",
});

function formatDate(date: Date | null): string {
  return date ? dateFormat.format(date) : "To be announced";
}

export default async function MemberElectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ nomination?: string }>;
}) {
  const member = await requireMember();
  const { nomination } = await searchParams;
  const election = await getCurrentPublishedElection();

  if (!election) {
    return (
      <>
        <PortalPageHeader
          title="Voting & Elections"
          description="Everything you need to take part in choosing the association's leadership."
        />
        <EmptyState
          icon={<Vote size={28} aria-hidden="true" />}
          title="No election is open right now"
          description="When the next election is announced, its dates, candidates and voting details will appear here."
        />
      </>
    );
  }

  // Standing for office and voting both turn on dues, so both are worked
  // out here rather than only discovered at a terminal on the day.
  const owner = { kind: "member" as const, id: member.id, email: member.email };
  const [positions, candidacy, duesPaid, voted, hasPortalCv, formsPaidFor] = await Promise.all([
    getBallotPaper(election.id),
    getMemberCandidacy(election.id, member.id),
    hasPaidDuesForYear(member.id, getCurrentAcademicYear()),
    db.electionVoter.findUnique({
      where: { electionId_memberId: { electionId: election.id, memberId: member.id } },
      select: { votedAt: true },
    }),
    hasPaidFor(owner, PaidDocumentKind.CV),
    // Which posts this member has already bought the form for.
    db.documentPurchase.findMany({
      where: {
        memberId: member.id,
        kind: PaidDocumentKind.NOMINATION_FORM,
        status: "SUCCESS",
        positionId: { not: null },
      },
      select: { positionId: true },
    }),
  ]);

  const paidPositionIds = new Set(formsPaidFor.map((row) => row.positionId));
  const nominatable = positions.map((position) => ({
    id: position.id,
    title: position.title,
    feeLabel: formatCedis(position.nominationFeePesewas),
    free: position.nominationFeePesewas === 0,
    paid: paidPositionIds.has(position.id),
  }));

  const now = new Date();
  const nominationsOpen =
    (!election.nominationStart || now >= election.nominationStart) &&
    (!election.nominationEnd || now <= election.nominationEnd) &&
    positions.length > 0;

  return (
    <>
      <PortalPageHeader
        title="Voting & Elections"
        description="Everything you need to take part in choosing the association's leadership."
      />

      <div className="space-y-6">
        {nomination && (
          <p role="status" className="rounded-lg border border-warning bg-warning-light px-4 py-3 text-sm text-ink">
            {nomination}
          </p>
        )}

        <DashboardCard id="election" title={election.title} icon={<Vote size={20} />} readAloud>
          {election.description && <p className="text-ink whitespace-pre-line">{election.description}</p>}
          {election.noticeText && (
            <p role="status" className="mt-4 rounded-lg border border-warning bg-warning-light px-4 py-3 text-sm text-ink">
              {election.noticeText}
            </p>
          )}
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-line p-4">
              <dt className="text-sm text-slate">Nominations</dt>
              <dd className="font-semibold text-primary-950 mt-1">
                {formatDate(election.nominationStart)} – {formatDate(election.nominationEnd)}
              </dd>
            </div>
            <div className="rounded-lg border border-line p-4">
              <dt className="text-sm text-slate">Voting</dt>
              <dd className="font-semibold text-primary-950 mt-1">
                {election.votingOpensAt ? dateTime.format(election.votingOpensAt) : formatDate(election.votingDate)}
              </dd>
              <dd className="text-sm text-slate mt-1">{PHASE_LABELS[effectivePhase(election)]}</dd>
            </div>
            <div className="rounded-lg border border-line p-4">
              <dt className="text-sm text-slate">How to Vote</dt>
              <dd className="font-semibold text-primary-950 mt-1">{election.venueOrMethod || "To be announced"}</dd>
            </div>
          </dl>
        </DashboardCard>

        {voted && (
          <section
            aria-labelledby="voted-heading"
            className="bg-white rounded-xl border border-success shadow-card p-5 sm:p-6"
          >
            <h2 id="voted-heading" className="flex items-center gap-2 font-display font-bold text-lg text-primary-950">
              <CheckCircle2 size={20} aria-hidden="true" className="text-success" /> You have voted
            </h2>
            <p className="text-ink mt-2">
              Your vote was recorded on {dateTime.format(voted.votedAt)}. Which way you voted is not recorded anywhere
              against your name — the roll knows you came, and the ballot box knows the result.
            </p>
          </section>
        )}

        <section aria-labelledby="standing-heading" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
          <h2 id="standing-heading" className="font-display font-bold text-lg text-primary-950 mb-2">
            Standing for office
          </h2>

          {candidacy ? (
            <div>
              <p className="text-ink">
                You put your name forward for <strong>{candidacy.position}</strong>.
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm">
                <StatusBadge status={candidacy.status} />
                <span className="text-slate">
                  {candidacy.status === "PENDING" && "The Electoral Commission has it and will decide shortly."}
                  {candidacy.status === "APPROVED" && "You are on the ballot paper."}
                  {candidacy.status === "REJECTED" && "The commission did not accept this nomination."}
                  {candidacy.status === "WITHDRAWN" && "This nomination has been withdrawn."}
                </span>
              </p>
              {candidacy.reviewNote && (
                <p className="mt-3 rounded-lg border border-line bg-surface-muted px-4 py-3 text-sm text-ink">
                  <span className="font-semibold">From the commission:</span> {candidacy.reviewNote}
                </p>
              )}
            </div>
          ) : !nominationsOpen ? (
            <p className="text-slate">
              {positions.length === 0
                ? "The posts being contested haven't been announced yet."
                : "Nominations are not open at the moment."}
            </p>
          ) : !duesPaid ? (
            <div>
              <p className="text-ink">
                Your dues for {getCurrentAcademicYear()} need to be paid before you can stand for office — the same
                rule that decides who may vote.
              </p>
              <p className="mt-3">
                <Link
                  href="/membership/dashboard/dues"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
                >
                  <BadgeCheck size={15} aria-hidden="true" /> Pay your dues
                </Link>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-slate mb-4">
                Nominations close {formatDate(election.nominationEnd)}. The Electoral Commission decides who goes on
                the ballot paper.
              </p>
              <NominationForm electionId={election.id} positions={nominatable} hasPortalCv={hasPortalCv} />
            </div>
          )}
        </section>

        {positions.some((p) => p.candidates.length > 0) && (
          <section
            aria-labelledby="candidates-heading"
            className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6"
          >
            <h2 id="candidates-heading" className="font-display font-bold text-lg text-primary-950 mb-4">
              Candidates
            </h2>
            <div className="space-y-5">
              {positions
                .filter((position) => position.candidates.length > 0)
                .map((position) => (
                  <div key={position.id}>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate mb-2">{position.title}</h3>
                    <ul className="grid gap-4 sm:grid-cols-2">
                      {position.candidates.map((candidate) => (
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
                            {candidate.manifesto && (
                              <p className="text-sm text-slate mt-1 whitespace-pre-line">{candidate.manifesto}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
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
          <Link
            href="/elections"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
          >
            Open the public elections page <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </p>
      </div>
    </>
  );
}
