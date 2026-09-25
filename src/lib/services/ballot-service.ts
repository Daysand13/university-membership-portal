import "server-only";
import { db } from "@/lib/db";
import { CandidateStatus, ElectionPhase, Prisma } from "@/generated/prisma/client";
import type { Election, PollingStation } from "@/generated/prisma/client";
import { effectivePhase, isAcceptingVotes } from "@/lib/election-status";
import { LATE_BALLOT_GRACE_HOURS, readBallotToken, signBallotToken } from "@/lib/auth/ballot-token";
import { getCurrentAcademicYear, hasPaidDuesForYear } from "@/lib/services/dues-service";

/**
 * Checking a voter in, and taking their ballot.
 *
 * These are the only two things a polling terminal can do, and between
 * them sits the one rule the whole exercise rests on: the roll knows who
 * voted, the ballot box knows what was voted for, and nothing in this file
 * writes a row that joins the two.
 */

/**
 * What the officer at the terminal is shown to check against the person
 * standing there: their photograph, their name, their index number and
 * what they study. Nothing about anybody's health or support needs — that
 * is on file for the association's own purposes and has no business on a
 * screen in a crowded hall.
 */
export interface VoterOnScreen {
  firstName: string;
  fullName: string;
  indexNumber: string;
  photoUrl: string | null;
  programme: string;
  level: string;
  campus: string;
}

export type VerifyOutcome =
  | ({ status: "VERIFIED"; token: string } & VoterOnScreen)
  | { status: "INVALID_INDEX" }
  | { status: "DUES_UNPAID" }
  | { status: "ALREADY_VOTED" }
  | { status: "VOTING_CLOSED"; phase: ElectionPhase; notice: string | null };

/**
 * The four answers a terminal can get back at the keypad, in the order they
 * are asked: is this election taking votes, is this a member, are they paid
 * up, and have they already been.
 */
export async function verifyVoter(params: {
  election: Election;
  indexNumber: string;
  stationCode: string | null;
}): Promise<VerifyOutcome> {
  const { election } = params;
  if (!isAcceptingVotes(election)) {
    return { status: "VOTING_CLOSED", phase: effectivePhase(election), notice: election.noticeText };
  }

  const indexNumber = params.indexNumber.trim().toUpperCase();
  const member = await db.member.findUnique({
    where: { indexNumber },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      status: true,
      indexNumber: true,
      profileImageUrl: true,
      programme: true,
      level: true,
      campus: true,
    },
  });
  // A suspended or inactive account is not told it is suspended at a
  // public terminal with a queue behind it; it reads as not registered,
  // and the office can explain in private.
  if (!member || member.status !== "ACTIVE") return { status: "INVALID_INDEX" };

  if (!(await hasPaidDuesForYear(member.id, getCurrentAcademicYear()))) {
    return { status: "DUES_UNPAID" };
  }

  const onRoll = await db.electionVoter.findUnique({
    where: { electionId_memberId: { electionId: election.id, memberId: member.id } },
    select: { id: true },
  });
  if (onRoll) return { status: "ALREADY_VOTED" };

  const token = await signBallotToken({
    memberId: member.id,
    electionId: election.id,
    expiresAt: ballotDeadline(election),
  });

  return {
    status: "VERIFIED",
    token,
    firstName: member.firstName,
    fullName: [member.firstName, member.middleName, member.lastName].filter(Boolean).join(" "),
    indexNumber: member.indexNumber,
    photoUrl: member.profileImageUrl,
    programme: member.programme,
    level: member.level,
    campus: member.campus,
  };
}

/** Until when a slip issued now will still be honoured, queued or not. */
function ballotDeadline(election: Election): Date {
  const close = election.votingClosesAt?.getTime() ?? Date.now();
  return new Date(Math.max(close, Date.now()) + LATE_BALLOT_GRACE_HOURS * 3_600_000);
}

export type CastOutcome =
  | { status: "RECORDED" }
  | { status: "ALREADY_VOTED" }
  | { status: "EXPIRED" }
  | { status: "INVALID_BALLOT"; reason: string };

/**
 * Taking a completed ballot paper.
 *
 * Everything lands in one transaction, so a vote is either on the roll and
 * in the box or in neither. A paper that was queued while the line was
 * down and then sent twice is recognised by the terminal's own reference
 * and acknowledged without being counted again.
 */
export async function castBallot(params: {
  election: Election;
  token: string;
  clientRef: string;
  station: PollingStation | null;
  /**
   * A mark per post. Where only one person stands the question is whether
   * to have them, not which of them — so the mark carries an answer.
   */
  choices: { positionId: string; candidateId: string; approve?: boolean }[];
}): Promise<CastOutcome> {
  const slip = await readBallotToken(params.token);
  if (!slip || slip.electionId !== params.election.id) return { status: "EXPIRED" };

  const clientRef = params.clientRef.trim();
  if (clientRef.length < 8 || clientRef.length > 128) {
    return { status: "INVALID_BALLOT", reason: "The terminal sent no usable reference for this ballot." };
  }

  const existing = await db.electionBallot.findUnique({ where: { clientRef }, select: { id: true } });
  if (existing) return { status: "RECORDED" };

  // Skipping a portfolio is allowed; voting twice in one is not, and
  // neither is voting for somebody who isn't standing for it.
  const seen = new Set<string>();
  for (const choice of params.choices) {
    if (seen.has(choice.positionId)) {
      return { status: "INVALID_BALLOT", reason: "Two marks against one portfolio." };
    }
    seen.add(choice.positionId);
  }

  if (params.choices.length > 0) {
    const candidates = await db.electionCandidate.findMany({
      where: {
        id: { in: params.choices.map((c) => c.candidateId) },
        electionId: params.election.id,
        status: CandidateStatus.APPROVED,
      },
      select: { id: true, positionId: true },
    });
    const byId = new Map(candidates.map((c) => [c.id, c.positionId]));
    for (const choice of params.choices) {
      if (!byId.has(choice.candidateId) || byId.get(choice.candidateId) !== choice.positionId) {
        return { status: "INVALID_BALLOT", reason: "A mark was made against somebody not standing for that post." };
      }
    }
  }

  // Rounded down to the hour on the way in — see the comment on the model.
  const castHour = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000);

  try {
    await db.$transaction(async (tx) => {
      await tx.electionVoter.create({
        data: {
          electionId: params.election.id,
          memberId: slip.memberId,
          stationCode: params.station?.code ?? null,
        },
      });
      const ballot = await tx.electionBallot.create({
        data: {
          electionId: params.election.id,
          clientRef,
          castHour,
          stationId: params.station?.id ?? null,
        },
      });
      if (params.choices.length > 0) {
        await tx.electionVoteChoice.createMany({
          data: params.choices.map((choice) => ({
            ballotId: ballot.id,
            candidateId: choice.candidateId,
            positionId: choice.positionId,
            // Anything with a real contest is always a yes for somebody.
            approve: choice.approve !== false,
          })),
        });
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // The roll already has this member: they voted somewhere else while
      // this paper was sitting in a queue.
      return { status: "ALREADY_VOTED" };
    }
    throw err;
  }

  return { status: "RECORDED" };
}
