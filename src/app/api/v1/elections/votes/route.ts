import { NextResponse, type NextRequest } from "next/server";
import { jsonError, requireStation } from "@/lib/api/station-request";
import { getCurrentBallotElection } from "@/lib/services/election-service";
import { castBallot } from "@/lib/services/ballot-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IncomingChoice {
  positionId?: unknown;
  candidateId?: unknown;
}

/**
 * A completed ballot paper arriving from a terminal — now, or hours later
 * out of a queue that was waiting for the line to come back.
 *
 * The terminal's own reference for the paper makes resending safe: a
 * second delivery of the same paper is acknowledged and dropped rather
 * than counted. Nothing in the request names the voter; the signed slip
 * does, and it goes no further than the roll.
 */
export async function POST(request: NextRequest) {
  const auth = await requireStation(request);
  if ("response" in auth) return auth.response;

  let body: { token?: unknown; clientRef?: unknown; choices?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("That request wasn't readable.", 400);
  }

  const token = typeof body.token === "string" ? body.token : "";
  const clientRef = typeof body.clientRef === "string" ? body.clientRef : "";
  if (!token || !clientRef) return jsonError("A ballot needs both a voting slip and a reference.", 400);

  const rawChoices = Array.isArray(body.choices) ? (body.choices as IncomingChoice[]) : [];
  if (rawChoices.length > 50) return jsonError("That is not a ballot paper.", 400);

  const choices: { positionId: string; candidateId: string }[] = [];
  for (const choice of rawChoices) {
    if (typeof choice?.positionId !== "string" || typeof choice?.candidateId !== "string") {
      return jsonError("A mark on that paper was unreadable.", 400);
    }
    choices.push({ positionId: choice.positionId, candidateId: choice.candidateId });
  }

  const election = await getCurrentBallotElection();
  if (!election) return jsonError("There is no election to vote in.", 409);

  const outcome = await castBallot({
    election,
    token,
    clientRef,
    station: auth.station,
    choices,
  });

  // An expired slip and a spoiled paper are the terminal's problem to
  // report; a vote already on the roll is an ordinary answer.
  const status = outcome.status === "EXPIRED" || outcome.status === "INVALID_BALLOT" ? 422 : 200;
  return NextResponse.json({ ok: status === 200, ...outcome }, { status });
}
