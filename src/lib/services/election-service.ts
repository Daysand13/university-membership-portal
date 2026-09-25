import "server-only";
import { db } from "@/lib/db";
import { CandidateStatus, ContentStatus, ElectionPhase, PaidDocumentKind } from "@/generated/prisma/client";
import { hasPaidFor } from "@/lib/services/document-purchase-service";
import type { AdminUser, Prisma } from "@/generated/prisma/client";
import type { ElectionInput } from "@/lib/validations/content";
import { formatFullName } from "@/lib/format";
import { getCurrentAcademicYear, hasPaidDuesForYear } from "@/lib/services/dues-service";

export async function getCurrentPublishedElection() {
  return db.election.findFirst({
    where: { status: ContentStatus.PUBLISHED },
    include: { candidates: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listElectionsForAdmin() {
  return db.election.findMany({ orderBy: { createdAt: "desc" }, include: { candidates: true } });
}

export async function getElectionForAdmin(id: string) {
  return db.election.findUnique({ where: { id }, include: { candidates: true } });
}

export async function createElection(input: ElectionInput, adminId: string) {
  return db.election.create({
    data: {
      title: input.title,
      description: input.description || null,
      status: input.status,
      nominationStart: input.nominationStart ?? null,
      nominationEnd: input.nominationEnd ?? null,
      votingDate: input.votingDate ?? null,
      venueOrMethod: input.venueOrMethod || null,
      resultsSummary: input.resultsSummary || null,
      createdById: adminId,
    },
  });
}

export async function updateElection(id: string, input: ElectionInput) {
  return db.election.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description || null,
      status: input.status,
      nominationStart: input.nominationStart ?? null,
      nominationEnd: input.nominationEnd ?? null,
      votingDate: input.votingDate ?? null,
      venueOrMethod: input.venueOrMethod || null,
      resultsSummary: input.resultsSummary || null,
    },
  });
}

export async function deleteElection(id: string) {
  return db.election.delete({ where: { id } });
}

// ===========================================================================
// THE BALLOT
//
// Everything below is about the day itself: the portfolios being contested,
// who is standing for them, when the terminals will take a vote, and what
// the count says afterwards. The functions above only ever concerned the
// election's page on the website.
// ===========================================================================

/**
 * The election the polling terminals are serving.
 *
 * Whichever one still has a voting day ahead of it or under way; once they
 * are all finished, the one that finished last, so a terminal switched on
 * the morning after is told voting has ended rather than nothing at all.
 */
export async function getCurrentBallotElection() {
  const live = await db.election.findFirst({
    where: { phase: { not: ElectionPhase.CLOSED }, votingOpensAt: { not: null } },
    orderBy: { votingOpensAt: "asc" },
  });
  if (live) return live;
  return db.election.findFirst({
    where: { votingClosesAt: { not: null } },
    orderBy: { votingClosesAt: "desc" },
  });
}

/** An election with everything the commission's screen shows about it. */
export async function getElectionForCommission(id: string) {
  return db.election.findUnique({
    where: { id },
    include: {
      positions: {
        orderBy: [{ order: "asc" }, { title: "asc" }],
        include: {
          candidates: {
            orderBy: { name: "asc" },
            include: { member: { select: { id: true, indexNumber: true, firstName: true, lastName: true } } },
          },
        },
      },
      candidates: {
        orderBy: { createdAt: "desc" },
        include: { member: { select: { id: true, indexNumber: true, firstName: true, lastName: true } } },
      },
      _count: { select: { voters: true, ballots: true } },
    },
  });
}

/** The ballot paper itself: portfolios in order, each with its approved candidates. */
export async function getBallotPaper(electionId: string) {
  return db.electionPosition.findMany({
    where: { electionId },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: {
      candidates: {
        where: { status: CandidateStatus.APPROVED },
        orderBy: { name: "asc" },
        select: { id: true, name: true, photoUrl: true, manifesto: true },
      },
    },
  });
}

async function recordElectionAudit(params: {
  actor: Pick<AdminUser, "id">;
  action: string;
  electionId: string;
  previousValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  note?: string;
}) {
  await db.auditLog.create({
    data: {
      adminId: params.actor.id,
      action: params.action,
      entityType: "Election",
      entityId: params.electionId,
      previousValue: params.previousValue,
      newValue: params.newValue,
      note: params.note,
    },
  });
}

/**
 * The opening and closing times, set before the day.
 *
 * The informational "voting date" on the public page is kept in step with
 * the opening time, so the two can't disagree in front of the members.
 */
export async function setVotingWindow(params: {
  electionId: string;
  opensAt: Date | null;
  closesAt: Date | null;
  actor: Pick<AdminUser, "id">;
}) {
  const before = await db.election.findUniqueOrThrow({ where: { id: params.electionId } });
  const election = await db.election.update({
    where: { id: params.electionId },
    data: {
      votingOpensAt: params.opensAt,
      votingClosesAt: params.closesAt,
      votingDate: params.opensAt ?? before.votingDate,
    },
  });

  await recordElectionAudit({
    actor: params.actor,
    action: "SET_VOTING_WINDOW",
    electionId: election.id,
    previousValue: {
      opensAt: before.votingOpensAt?.toISOString() ?? null,
      closesAt: before.votingClosesAt?.toISOString() ?? null,
    },
    newValue: {
      opensAt: params.opensAt?.toISOString() ?? null,
      closesAt: params.closesAt?.toISOString() ?? null,
    },
  });
  return election;
}

/**
 * More time, added while voting is under way.
 *
 * A late start at one centre, a queue still at the door at closing — the
 * commission adds minutes and every terminal picks the new closing time up
 * on its next check, without anyone touching the machines.
 */
export async function extendVoting(params: {
  electionId: string;
  minutes: number;
  actor: Pick<AdminUser, "id">;
}) {
  const before = await db.election.findUniqueOrThrow({ where: { id: params.electionId } });
  if (!before.votingClosesAt) throw new Error("Set a closing time before extending it.");

  // Extend from now when closing time has already gone by, so "add 30
  // minutes" at five past always means thirty more minutes of voting.
  const from = Math.max(before.votingClosesAt.getTime(), Date.now());
  const closesAt = new Date(from + params.minutes * 60_000);

  const election = await db.election.update({
    where: { id: params.electionId },
    data: {
      votingClosesAt: closesAt,
      // Re-opening after the published closing time is a decision, so the
      // phase says so rather than leaving it to the clock.
      phase: before.phase === ElectionPhase.CLOSED ? ElectionPhase.OPEN : before.phase,
    },
  });

  await recordElectionAudit({
    actor: params.actor,
    action: "EXTEND_VOTING",
    electionId: election.id,
    previousValue: { closesAt: before.votingClosesAt.toISOString() },
    newValue: { closesAt: closesAt.toISOString(), minutes: params.minutes },
  });
  return election;
}

/** Postponing, opening early, or ending it there and then. */
export async function setElectionPhase(params: {
  electionId: string;
  phase: ElectionPhase;
  notice: string | null;
  actor: Pick<AdminUser, "id">;
}) {
  const before = await db.election.findUniqueOrThrow({ where: { id: params.electionId } });
  const election = await db.election.update({
    where: { id: params.electionId },
    data: { phase: params.phase, noticeText: params.notice },
  });

  await recordElectionAudit({
    actor: params.actor,
    action: "SET_ELECTION_PHASE",
    electionId: election.id,
    previousValue: { phase: before.phase },
    newValue: { phase: params.phase },
    note: params.notice ?? undefined,
  });
  return election;
}

/** The commission's switch over the public results page. */
export async function setResultsPublic(params: {
  electionId: string;
  isPublic: boolean;
  actor: Pick<AdminUser, "id">;
}) {
  const election = await db.election.update({
    where: { id: params.electionId },
    data: { resultsPublic: params.isPublic },
  });
  await recordElectionAudit({
    actor: params.actor,
    action: params.isPublic ? "SHOW_ELECTION_RESULTS" : "HIDE_ELECTION_RESULTS",
    electionId: election.id,
    newValue: { resultsPublic: params.isPublic },
  });
  return election;
}

// --- Portfolios ------------------------------------------------------------

export async function addPosition(params: {
  electionId: string;
  title: string;
  order: number;
  nominationFeePesewas: number;
}) {
  return db.electionPosition.create({
    data: {
      electionId: params.electionId,
      title: params.title.trim(),
      order: params.order,
      nominationFeePesewas: params.nominationFeePesewas,
    },
  });
}

export async function updatePosition(params: {
  id: string;
  title: string;
  order: number;
  nominationFeePesewas: number;
}) {
  return db.electionPosition.update({
    where: { id: params.id },
    data: {
      title: params.title.trim(),
      order: params.order,
      nominationFeePesewas: params.nominationFeePesewas,
    },
  });
}

/** What the commission charges for the form to stand for each post. */
export async function setNominationFee(params: {
  positionId: string;
  nominationFeePesewas: number;
  actor: Pick<AdminUser, "id">;
}) {
  const before = await db.electionPosition.findUniqueOrThrow({ where: { id: params.positionId } });
  const position = await db.electionPosition.update({
    where: { id: params.positionId },
    data: { nominationFeePesewas: params.nominationFeePesewas },
  });

  await db.auditLog.create({
    data: {
      adminId: params.actor.id,
      action: "SET_NOMINATION_FEE",
      entityType: "ElectionPosition",
      entityId: position.id,
      previousValue: { nominationFeePesewas: before.nominationFeePesewas },
      newValue: { title: position.title, nominationFeePesewas: position.nominationFeePesewas },
    },
  });
  return position;
}

export async function deletePosition(id: string) {
  return db.electionPosition.delete({ where: { id } });
}

// --- Candidates ------------------------------------------------------------

/** A candidate the commission enters itself, already approved. */
export async function addCandidate(params: {
  electionId: string;
  positionId: string | null;
  name: string;
  photoUrl: string | null;
  manifesto: string | null;
}) {
  const position = params.positionId
    ? await db.electionPosition.findUnique({ where: { id: params.positionId } })
    : null;
  return db.electionCandidate.create({
    data: {
      electionId: params.electionId,
      positionId: position?.id ?? null,
      position: position?.title ?? "Candidate",
      name: params.name.trim(),
      photoUrl: params.photoUrl,
      manifesto: params.manifesto,
      status: CandidateStatus.APPROVED,
    },
  });
}

export async function reviewCandidate(params: {
  candidateId: string;
  status: CandidateStatus;
  note: string | null;
  actor: Pick<AdminUser, "id">;
}) {
  const candidate = await db.electionCandidate.update({
    where: { id: params.candidateId },
    data: {
      status: params.status,
      reviewNote: params.note,
      reviewedById: params.actor.id,
      reviewedAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      adminId: params.actor.id,
      action: "REVIEW_ELECTION_CANDIDATE",
      entityType: "ElectionCandidate",
      entityId: candidate.id,
      newValue: { status: params.status },
      note: params.note,
    },
  });
  return candidate;
}

export async function deleteCandidate(id: string) {
  return db.electionCandidate.delete({ where: { id } });
}

// --- Standing for office ---------------------------------------------------

export type NominationResult =
  | { ok: true; candidateId: string }
  | { ok: false; error: string };

/**
 * A member putting themselves forward.
 *
 * Dues are checked here rather than in the form, so the rule holds however
 * the request arrives. The commission sees the nomination as PENDING and
 * decides; nothing appears on a ballot paper until it does.
 */
export async function nominateForElection(params: {
  electionId: string;
  memberId: string;
  positionId: string;
  manifesto: string;
  /** What they put forward with it — their portal CV, or a file of their own. */
  supporting: { url: string | null; name: string | null; usedPortalCv: boolean };
}): Promise<NominationResult> {
  const [election, member, position] = await Promise.all([
    db.election.findUnique({ where: { id: params.electionId } }),
    db.member.findUnique({ where: { id: params.memberId } }),
    db.electionPosition.findUnique({ where: { id: params.positionId } }),
  ]);

  if (!election || !member || !position || position.electionId !== election.id) {
    return { ok: false, error: "That election isn't open for nominations." };
  }

  const now = new Date();
  if (election.nominationStart && now < election.nominationStart) {
    return { ok: false, error: "Nominations haven't opened yet." };
  }
  if (election.nominationEnd && now > election.nominationEnd) {
    return { ok: false, error: "Nominations have closed." };
  }
  if (member.status !== "ACTIVE") {
    return { ok: false, error: "Only active members can stand for office." };
  }
  if (!(await hasPaidDuesForYear(member.id, getCurrentAcademicYear()))) {
    return { ok: false, error: "Your dues for this academic year need to be paid before you can stand." };
  }

  const already = await db.electionCandidate.findFirst({
    where: {
      electionId: election.id,
      memberId: member.id,
      status: { in: [CandidateStatus.PENDING, CandidateStatus.APPROVED] },
    },
  });
  if (already) {
    return { ok: false, error: "You have already been nominated for this election." };
  }

  // The form is paid for before anything is written down, so a
  // nomination never sits in the commission's queue unpaid.
  const paidForForm = await hasPaidFor(
    { kind: "member", id: member.id, email: member.email },
    PaidDocumentKind.NOMINATION_FORM,
    position.id,
  );
  if (position.nominationFeePesewas > 0 && !paidForForm) {
    return { ok: false, error: `Buy the nomination form for ${position.title} first.` };
  }

  const candidate = await db.electionCandidate.create({
    data: {
      electionId: election.id,
      positionId: position.id,
      position: position.title,
      memberId: member.id,
      name: formatFullName(member.firstName, member.middleName, member.lastName),
      photoUrl: member.profileImageUrl,
      manifesto: params.manifesto.trim(),
      status: CandidateStatus.PENDING,
      supportingUrl: params.supporting.url,
      supportingName: params.supporting.name,
      usedPortalCv: params.supporting.usedPortalCv,
    },
  });
  return { ok: true, candidateId: candidate.id };
}

/** What this member has already put in for, so the page doesn't offer it twice. */
export async function getMemberCandidacy(electionId: string, memberId: string) {
  return db.electionCandidate.findFirst({
    where: { electionId, memberId },
    orderBy: { createdAt: "desc" },
    include: { portfolio: true },
  });
}

// --- The count -------------------------------------------------------------

export interface PositionResult {
  positionId: string;
  title: string;
  totalVotes: number;
  /**
   * A post with one candidate is a yes-or-no question, not a choice, so
   * its result reads as approval rather than a share of the vote.
   */
  unopposed: boolean;
  yesVotes: number;
  noVotes: number;
  candidates: { id: string; name: string; photoUrl: string | null; votes: number; share: number }[];
}

export interface ElectionResults {
  positions: PositionResult[];
  ballotsCast: number;
  votersOnRoll: number;
  eligibleVoters: number;
  turnout: number;
}

/**
 * The count, worked out from the ballots themselves rather than a running
 * total anyone could have nudged.
 */
export async function tallyElection(electionId: string): Promise<ElectionResults> {
  const [positions, counts, ballotsCast, votersOnRoll, eligibleVoters] = await Promise.all([
    db.electionPosition.findMany({
      where: { electionId },
      orderBy: [{ order: "asc" }, { title: "asc" }],
      include: {
        candidates: {
          where: { status: CandidateStatus.APPROVED },
          select: { id: true, name: true, photoUrl: true },
          orderBy: { name: "asc" },
        },
      },
    }),
    db.electionVoteChoice.groupBy({
      by: ["candidateId", "approve"],
      where: { ballot: { electionId } },
      _count: { _all: true },
    }),
    db.electionBallot.count({ where: { electionId } }),
    db.electionVoter.count({ where: { electionId } }),
    countEligibleVoters(),
  ]);

  const yesFor = new Map<string, number>();
  const noFor = new Map<string, number>();
  for (const row of counts) {
    (row.approve ? yesFor : noFor).set(row.candidateId, row._count._all);
  }

  return {
    positions: positions.map((position) => {
      // One candidate means the ballot asked whether to have them, not
      // which of them to have — so yes and no are counted apart.
      const unopposed = position.candidates.length === 1;
      const tallied = position.candidates.map((candidate) => ({
        ...candidate,
        votes: yesFor.get(candidate.id) ?? 0,
      }));
      const yesVotes = tallied.reduce((sum, candidate) => sum + candidate.votes, 0);
      const noVotes = position.candidates.reduce((sum, candidate) => sum + (noFor.get(candidate.id) ?? 0), 0);
      const totalVotes = yesVotes + noVotes;

      return {
        positionId: position.id,
        title: position.title,
        totalVotes,
        unopposed,
        yesVotes,
        noVotes,
        candidates: tallied
          .map((candidate) => ({
            ...candidate,
            share: totalVotes === 0 ? 0 : Math.round((candidate.votes / totalVotes) * 1000) / 10,
          }))
          .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name)),
      };
    }),
    ballotsCast,
    votersOnRoll,
    eligibleVoters,
    turnout: eligibleVoters === 0 ? 0 : Math.round((votersOnRoll / eligibleVoters) * 1000) / 10,
  };
}

/** Members who could vote today: active, and paid up for this academic year. */
export async function countEligibleVoters(academicYear = getCurrentAcademicYear()): Promise<number> {
  const paid = await db.duesPayment.groupBy({
    by: ["memberId"],
    where: { academicYear, status: "SUCCESS", member: { status: "ACTIVE" } },
  });
  return paid.length;
}
