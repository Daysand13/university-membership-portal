import { ElectionPhase } from "@/generated/prisma/enums";

/**
 * Where an election stands right now.
 *
 * The clock decides by default, so nobody has to remember to press a
 * button at eight in the morning. The Electoral Commission's own decisions
 * — postponing it, opening early, ending it there and then — override the
 * clock, which is the whole reason the stored phase exists.
 *
 * Client-safe: the terminals, the website and the commission's own screen
 * all need the same answer, so it is worked out in one place from plain
 * values rather than three times over.
 */

export interface ElectionTiming {
  phase: ElectionPhase;
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
}

export function effectivePhase(election: ElectionTiming, now: Date = new Date()): ElectionPhase {
  if (election.phase === ElectionPhase.POSTPONED) return ElectionPhase.POSTPONED;
  if (election.phase === ElectionPhase.CLOSED) return ElectionPhase.CLOSED;
  if (!election.votingOpensAt || !election.votingClosesAt) return ElectionPhase.SCHEDULED;
  if (now.getTime() >= election.votingClosesAt.getTime()) return ElectionPhase.CLOSED;
  // Opened by hand before the published time — a centre that is ready
  // early and has the commission's blessing.
  if (election.phase === ElectionPhase.OPEN) return ElectionPhase.OPEN;
  if (now.getTime() < election.votingOpensAt.getTime()) return ElectionPhase.SCHEDULED;
  return ElectionPhase.OPEN;
}

export function isAcceptingVotes(election: ElectionTiming, now: Date = new Date()): boolean {
  return effectivePhase(election, now) === ElectionPhase.OPEN;
}

/** Milliseconds until voting closes; null when that isn't a meaningful question yet. */
export function msUntilClose(election: ElectionTiming, now: Date = new Date()): number | null {
  if (!election.votingClosesAt) return null;
  if (effectivePhase(election, now) !== ElectionPhase.OPEN) return null;
  return Math.max(0, election.votingClosesAt.getTime() - now.getTime());
}

export const PHASE_LABELS: Record<ElectionPhase, string> = {
  [ElectionPhase.SCHEDULED]: "Not open yet",
  [ElectionPhase.OPEN]: "Voting is open",
  [ElectionPhase.POSTPONED]: "Postponed",
  [ElectionPhase.CLOSED]: "Voting has closed",
};

/** What a terminal says to somebody who arrives when they can't vote. */
export const PHASE_TERMINAL_MESSAGES: Record<ElectionPhase, string> = {
  [ElectionPhase.SCHEDULED]: "Access denied. Voting is currently closed.",
  [ElectionPhase.OPEN]: "Welcome to ASSN Ballot. Please enter your index number to begin.",
  [ElectionPhase.POSTPONED]: "Notice: The election has been postponed by the Electoral Commission.",
  [ElectionPhase.CLOSED]: "Voting has officially ended. Thank you for your participation.",
};
