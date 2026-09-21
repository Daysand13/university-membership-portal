"use server";

import {
  withActionErrorHandling,
  withTypedActionErrorHandling,
  withVoidActionErrorHandling,
} from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/admin";
import { requireMember } from "@/lib/auth/member";
import { CandidateStatus, ElectionPhase } from "@/generated/prisma/client";
import {
  candidateReviewSchema,
  candidateSchema,
  electionPhaseSchema,
  extendVotingSchema,
  nominationSchema,
  positionSchema,
  stationSchema,
  accraInputToDate,
  votingWindowSchema,
} from "@/lib/validations/elections";
import {
  addCandidate,
  addPosition,
  deleteCandidate,
  deletePosition,
  extendVoting,
  nominateForElection,
  reviewCandidate,
  setElectionPhase,
  setResultsPublic,
  setVotingWindow,
} from "@/lib/services/election-service";
import {
  registerStation,
  reissueStationKey,
  setStationActive,
} from "@/lib/services/polling-station-service";
import type { ActionState } from "./types";

/**
 * Running an election: the commission's decisions on the day, the posts
 * being contested, who is standing, the terminals in the halls — and, at
 * the end of the file, a member putting themselves forward.
 */

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function revalidateElection(electionId: string) {
  revalidatePath(`/admin/elections/${electionId}`);
  revalidatePath("/admin/elections");
  revalidatePath("/elections");
  revalidatePath("/membership/dashboard/elections");
}

// --- The day itself --------------------------------------------------------

async function setVotingWindowActionImpl(
  electionId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("elections.commission");
  const parsed = votingWindowSchema.safeParse({
    opensAt: text(formData, "opensAt"),
    closesAt: text(formData, "closesAt"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await setVotingWindow({
    electionId,
    opensAt: accraInputToDate(parsed.data.opensAt),
    closesAt: accraInputToDate(parsed.data.closesAt),
    actor: admin,
  });
  revalidateElection(electionId);
  return { success: true, message: "The terminals will pick the new times up within the minute." };
}

async function extendVotingActionImpl(
  electionId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("elections.commission");
  const parsed = extendVotingSchema.safeParse({
    minutes: text(formData, "minutes"),
    reason: text(formData, "reason"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const election = await extendVoting({ electionId, minutes: parsed.data.minutes, actor: admin });
  revalidateElection(electionId);
  return {
    success: true,
    message: `Voting now closes at ${election.votingClosesAt?.toISOString().slice(11, 16) ?? "the new time"}. Every terminal counts down to it.`,
  };
}

async function setElectionPhaseActionImpl(
  electionId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("elections.commission");
  const parsed = electionPhaseSchema.safeParse({
    phase: text(formData, "phase"),
    notice: text(formData, "notice"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  // Nobody should be able to postpone an election without saying why: it
  // is read out at every terminal to people standing in a queue.
  if (parsed.data.phase === ElectionPhase.POSTPONED && !parsed.data.notice) {
    return { fieldErrors: { notice: ["Say why it has been postponed — the terminals read this out"] } };
  }

  await setElectionPhase({
    electionId,
    phase: parsed.data.phase,
    notice: parsed.data.notice || null,
    actor: admin,
  });
  revalidateElection(electionId);
  return { success: true, message: "Every terminal is told within the minute." };
}

async function setResultsPublicActionImpl(electionId: string, isPublic: boolean): Promise<void> {
  const admin = await requireCapability("elections.commission");
  await setResultsPublic({ electionId, isPublic, actor: admin });
  revalidateElection(electionId);
}

// --- Posts and candidates --------------------------------------------------

async function addPositionActionImpl(
  electionId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCapability("elections.manage");
  const parsed = positionSchema.safeParse({ title: text(formData, "title"), order: text(formData, "order") || 0 });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await addPosition({ electionId, title: parsed.data.title, order: parsed.data.order });
  } catch {
    return { fieldErrors: { title: ["That post is already on this ballot"] } };
  }
  revalidateElection(electionId);
  return { success: true };
}

async function deletePositionActionImpl(positionId: string, electionId: string): Promise<void> {
  await requireCapability("elections.manage");
  await deletePosition(positionId);
  revalidateElection(electionId);
}

async function addCandidateActionImpl(
  electionId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCapability("elections.manage");
  const parsed = candidateSchema.safeParse({
    name: text(formData, "name"),
    positionId: text(formData, "positionId"),
    photoUrl: text(formData, "photoUrl"),
    manifesto: text(formData, "manifesto"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await addCandidate({
    electionId,
    positionId: parsed.data.positionId,
    name: parsed.data.name,
    photoUrl: parsed.data.photoUrl || null,
    manifesto: parsed.data.manifesto || null,
  });
  revalidateElection(electionId);
  return { success: true };
}

async function reviewCandidateActionImpl(
  candidateId: string,
  electionId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("elections.nominations");
  const parsed = candidateReviewSchema.safeParse({
    status: text(formData, "status"),
    note: text(formData, "note"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  // Turning somebody down without a word is how a dispute starts.
  if (parsed.data.status === CandidateStatus.REJECTED && !parsed.data.note) {
    return { fieldErrors: { note: ["Say why — they are entitled to know"] } };
  }

  await reviewCandidate({
    candidateId,
    status: parsed.data.status,
    note: parsed.data.note || null,
    actor: admin,
  });
  revalidateElection(electionId);
  return { success: true };
}

async function deleteCandidateActionImpl(candidateId: string, electionId: string): Promise<void> {
  await requireCapability("elections.manage");
  await deleteCandidate(candidateId);
  revalidateElection(electionId);
}

// --- Terminals -------------------------------------------------------------

async function registerStationActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireCapability("elections.stations");
  const parsed = stationSchema.safeParse({ code: text(formData, "code"), name: text(formData, "name") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  let issued;
  try {
    issued = await registerStation({ code: parsed.data.code, name: parsed.data.name, actor: admin });
  } catch {
    return { fieldErrors: { code: ["A terminal already has that code"] } };
  }

  revalidatePath("/admin/elections/stations");
  // The only time this key is ever legible. It is hashed in the database,
  // exactly like a password, so there is nothing to show a second time.
  return {
    success: true,
    message: `Key for ${issued.station.code}: ${issued.key} — write it down now. It cannot be shown again.`,
  };
}

async function reissueStationKeyActionImpl(stationId: string): Promise<string> {
  const admin = await requireCapability("elections.stations");
  const issued = await reissueStationKey({ stationId, actor: admin });
  revalidatePath("/admin/elections/stations");
  return `New key for ${issued.station.code}: ${issued.key} — the old one stops working now.`;
}

async function setStationActiveActionImpl(stationId: string, isActive: boolean): Promise<void> {
  const admin = await requireCapability("elections.stations");
  await setStationActive({ stationId, isActive, actor: admin });
  revalidatePath("/admin/elections/stations");
}

// --- Standing for office ---------------------------------------------------

async function submitNominationActionImpl(
  electionId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await requireMember();
  const parsed = nominationSchema.safeParse({
    positionId: text(formData, "positionId"),
    manifesto: text(formData, "manifesto"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await nominateForElection({
    electionId,
    memberId: member.id,
    positionId: parsed.data.positionId,
    manifesto: parsed.data.manifesto,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/membership/dashboard/elections");
  revalidatePath(`/admin/elections/${electionId}`);
  return {
    success: true,
    message: "The Electoral Commission has it. You will hear from them once they have decided.",
  };
}

// ---------------------------------------------------------------------------

export const setVotingWindowAction = withActionErrorHandling("setVotingWindowAction", setVotingWindowActionImpl);
export const extendVotingAction = withActionErrorHandling("extendVotingAction", extendVotingActionImpl);
export const setElectionPhaseAction = withActionErrorHandling("setElectionPhaseAction", setElectionPhaseActionImpl);
export const setResultsPublicAction = withVoidActionErrorHandling("setResultsPublicAction", setResultsPublicActionImpl);
export const addPositionAction = withActionErrorHandling("addPositionAction", addPositionActionImpl);
export const deletePositionAction = withVoidActionErrorHandling("deletePositionAction", deletePositionActionImpl);
export const addCandidateAction = withActionErrorHandling("addCandidateAction", addCandidateActionImpl);
export const reviewCandidateAction = withActionErrorHandling("reviewCandidateAction", reviewCandidateActionImpl);
export const deleteCandidateAction = withVoidActionErrorHandling("deleteCandidateAction", deleteCandidateActionImpl);
export const registerStationAction = withActionErrorHandling("registerStationAction", registerStationActionImpl);
export const reissueStationKeyAction = withTypedActionErrorHandling(
  "reissueStationKeyAction",
  reissueStationKeyActionImpl,
);
export const setStationActiveAction = withVoidActionErrorHandling("setStationActiveAction", setStationActiveActionImpl);
export const submitNominationAction = withActionErrorHandling("submitNominationAction", submitNominationActionImpl);
