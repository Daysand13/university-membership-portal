import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MonitorSmartphone, Trash2 } from "lucide-react";
import { getAdminCapabilities, requireCapability } from "@/lib/auth/admin";
import { ElectionForm } from "@/components/admin/forms/ElectionForm";
import {
  CandidateForm,
  CandidateReviewForm,
  ExtendVotingForm,
  PhaseForm,
  PositionForm,
  ResultsSwitch,
  VotingWindowForm,
} from "@/components/admin/forms/BallotForms";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { deleteCandidateAction, deletePositionAction } from "@/lib/actions/ballot-actions";
import { getElectionForCommission, tallyElection } from "@/lib/services/election-service";
import { PHASE_LABELS, effectivePhase } from "@/lib/election-status";
import { CandidateStatus, ElectionPhase } from "@/generated/prisma/client";
import { NominationFeeForm } from "@/components/admin/forms/PriceForms";
import { formatCedis } from "@/lib/services/document-purchase-service";

export const metadata = { title: "Election" };
export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-GH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Accra",
});

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg border border-line p-6">
      <h2 className="font-display font-bold text-lg text-primary-950">{title}</h2>
      {description && <p className="text-sm text-slate mt-1 mb-4">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

export default async function AdminElectionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("elections.manage");
  const capabilities = await getAdminCapabilities();
  const canCommission = capabilities.has("elections.commission");
  const canReview = capabilities.has("elections.nominations");

  const { id } = await params;
  const election = await getElectionForCommission(id);
  if (!election) notFound();

  const results = await tallyElection(election.id);
  const phase = effectivePhase(election);
  const pending = election.candidates.filter((c) => c.status === CandidateStatus.PENDING);
  const unplaced = election.candidates.filter((c) => !c.positionId);

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/admin/elections"
        className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800"
      >
        <ChevronLeft size={16} aria-hidden="true" /> Elections
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display font-bold text-2xl text-primary-950">{election.title}</h1>
          <p className="text-sm text-slate mt-1">
            {PHASE_LABELS[phase]}
            {election.votingOpensAt && election.votingClosesAt && (
              <>
                {" · "}
                {dateTime.format(election.votingOpensAt)} to {dateTime.format(election.votingClosesAt)}
              </>
            )}
          </p>
        </div>
        <StatusBadge status={election.status} />
      </div>

      {election.noticeText && phase === ElectionPhase.POSTPONED && (
        <div role="status" className="rounded-lg border border-warning bg-warning-light px-4 py-3 text-sm text-ink">
          <span className="font-semibold">Read out at every terminal:</span> {election.noticeText}
        </div>
      )}

      {canCommission && (
        <Panel
          title="The day itself"
          description="What the terminals in the halls are doing. Every change here reaches them within the minute."
        >
          <div className="space-y-6">
            <VotingWindowForm
              electionId={election.id}
              opensAt={election.votingOpensAt}
              closesAt={election.votingClosesAt}
            />
            <div className="border-t border-line pt-5">
              <h3 className="text-sm font-semibold text-primary-950 mb-3">More time</h3>
              <ExtendVotingForm electionId={election.id} />
            </div>
            <div className="border-t border-line pt-5">
              <h3 className="text-sm font-semibold text-primary-950 mb-3">Open, postpone or close</h3>
              <PhaseForm electionId={election.id} phase={election.phase} notice={election.noticeText} />
            </div>
            <div className="border-t border-line pt-5">
              <ResultsSwitch electionId={election.id} isPublic={election.resultsPublic} />
            </div>
          </div>
        </Panel>
      )}

      <Panel title="The count" description="Worked out from the ballots themselves, not a running total.">
        <dl className="grid gap-3 sm:grid-cols-3 mb-5">
          <div className="rounded-lg border border-line p-4">
            <dt className="text-xs text-slate uppercase tracking-wide">Ballots cast</dt>
            <dd className="font-display font-bold text-2xl text-primary-950">{results.ballotsCast}</dd>
          </div>
          <div className="rounded-lg border border-line p-4">
            <dt className="text-xs text-slate uppercase tracking-wide">On the roll</dt>
            <dd className="font-display font-bold text-2xl text-primary-950">{results.votersOnRoll}</dd>
          </div>
          <div className="rounded-lg border border-line p-4">
            <dt className="text-xs text-slate uppercase tracking-wide">Turnout</dt>
            <dd className="font-display font-bold text-2xl text-primary-950">{results.turnout}%</dd>
            <dd className="text-xs text-slate mt-0.5">of {results.eligibleVoters} paid-up members</dd>
          </div>
        </dl>

        {results.positions.length === 0 ? (
          <p className="text-sm text-slate">No posts on the ballot yet.</p>
        ) : (
          <div className="space-y-5">
            {results.positions.map((position) => (
              <div key={position.positionId}>
                <h3 className="text-sm font-semibold text-primary-950 mb-2">
                  {position.title}{" "}
                  <span className="font-normal text-slate">
                    ·{" "}
                    {position.unopposed
                      ? `unopposed — ${position.yesVotes} yes, ${position.noVotes} no`
                      : `${position.totalVotes} votes`}
                  </span>
                </h3>
                <ul className="space-y-2">
                  {position.candidates.map((candidate) => (
                    <li key={candidate.id}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-ink">{candidate.name}</span>
                        <span className="text-slate shrink-0">
                          {candidate.votes} · {candidate.share}%
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary-800" style={{ width: `${candidate.share}%` }} />
                      </div>
                    </li>
                  ))}
                  {position.candidates.length === 0 && <li className="text-sm text-slate">Nobody standing yet.</li>}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {canReview && pending.length > 0 && (
        <Panel
          title={`Nominations waiting (${pending.length})`}
          description="Members who have put themselves forward. Nothing reaches a ballot paper until you decide."
        >
          <ul className="space-y-5">
            {pending.map((candidate) => (
              <li key={candidate.id} className="rounded-lg border border-line p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-primary-950">
                    {candidate.name}{" "}
                    <span className="font-normal text-slate">for {candidate.position}</span>
                  </p>
                  {candidate.member && (
                    <p className="text-xs text-slate font-data">{candidate.member.indexNumber}</p>
                  )}
                </div>
                {candidate.manifesto && (
                  <p className="text-sm text-ink mt-2 whitespace-pre-line">{candidate.manifesto}</p>
                )}
                <p className="text-sm mt-2">
                  {candidate.usedPortalCv ? (
                    <span className="text-slate">Attached their portal CV.</span>
                  ) : candidate.supportingUrl ? (
                    <a
                      href={candidate.supportingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary-800 hover:text-accent-600"
                    >
                      Open what they attached
                    </a>
                  ) : (
                    <span className="text-slate">Nothing attached.</span>
                  )}
                </p>
                <div className="mt-3">
                  <CandidateReviewForm
                    candidateId={candidate.id}
                    electionId={election.id}
                    status={CandidateStatus.APPROVED}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel
        title="The ballot paper"
        description="The posts being contested, in the order the terminals show them."
      >
        <div className="space-y-4">
          {election.positions.length === 0 ? (
            <p className="text-sm text-slate">No posts yet. Add the first one below.</p>
          ) : (
            <ul className="divide-y divide-line border border-line rounded-lg">
              {election.positions.map((position) => (
                <li key={position.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-primary-950">{position.title}</p>
                      <p className="text-xs text-slate">
                        {position.nominationFeePesewas > 0
                          ? `Form: ${formatCedis(position.nominationFeePesewas)} · `
                          : "No form fee · "}
                        {position.candidates.filter((c) => c.status === CandidateStatus.APPROVED).length} on the paper
                        {position.candidates.some((c) => c.status === CandidateStatus.PENDING) &&
                          ` · ${position.candidates.filter((c) => c.status === CandidateStatus.PENDING).length} waiting`}
                      </p>
                    </div>
                    {canCommission && (
                      <NominationFeeForm
                        positionId={position.id}
                        electionId={election.id}
                        title={position.title}
                        feePesewas={position.nominationFeePesewas}
                      />
                    )}
                    <ConfirmButton
                      action={deletePositionAction.bind(null, position.id, election.id)}
                      confirmMessage={`Take ${position.title} off the ballot? Anyone standing for it loses their place.`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger-light"
                    >
                      <Trash2 size={13} aria-hidden="true" /> Remove
                    </ConfirmButton>
                  </div>
                  {position.candidates.length > 0 && (
                    <ul className="mt-2.5 space-y-1.5">
                      {position.candidates.map((candidate) => (
                        <li key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="text-ink">
                            {candidate.name}
                            {candidate.member && (
                              <span className="text-slate"> · {candidate.member.indexNumber}</span>
                            )}
                          </span>
                          <span className="flex items-center gap-2">
                            <StatusBadge status={candidate.status} />
                            <ConfirmButton
                              action={deleteCandidateAction.bind(null, candidate.id, election.id)}
                              confirmMessage={`Remove ${candidate.name} from this election?`}
                              className="text-xs font-semibold text-danger hover:underline"
                            >
                              Remove
                            </ConfirmButton>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-primary-950 mb-3">Add a post</h3>
            <PositionForm electionId={election.id} nextOrder={election.positions.length} />
          </div>

          <div className="border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-primary-950 mb-3">Add a candidate yourself</h3>
            <CandidateForm
              electionId={election.id}
              positions={election.positions.map((p) => ({ id: p.id, title: p.title }))}
            />
          </div>
        </div>
      </Panel>

      {unplaced.length > 0 && (
        <Panel
          title="Not on a ballot paper"
          description="Entries from before the posts were set up. Give them a post, or remove them — the terminals can't show them as they are."
        >
          <ul className="space-y-2">
            {unplaced.map((candidate) => (
              <li key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-ink">
                  {candidate.name} <span className="text-slate">· {candidate.position}</span>
                </span>
                <ConfirmButton
                  action={deleteCandidateAction.bind(null, candidate.id, election.id)}
                  confirmMessage={`Remove ${candidate.name}?`}
                  className="text-xs font-semibold text-danger hover:underline"
                >
                  Remove
                </ConfirmButton>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="What the website says" description="The election's own page: dates, description, and the results summary.">
        <ElectionForm election={election} />
      </Panel>

      {capabilities.has("elections.stations") && (
        <p className="text-sm">
          <Link
            href="/admin/elections/stations"
            className="inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600"
          >
            <MonitorSmartphone size={15} aria-hidden="true" /> Polling terminals
          </Link>
        </p>
      )}
    </div>
  );
}
