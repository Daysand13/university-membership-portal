import { NextResponse, type NextRequest } from "next/server";
import { jsonError, requireStation } from "@/lib/api/station-request";
import { getCurrentBallotElection } from "@/lib/services/election-service";
import { verifyVoter } from "@/lib/services/ballot-service";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A voter at the keypad.
 *
 * Every answer comes back as 200 with a status on it, because none of them
 * is an error in the HTTP sense — "your dues aren't paid" is an answer, and
 * a terminal that has to tell the difference between that and a broken
 * connection is a terminal that will tell somebody the wrong thing.
 *
 * A verified voter is handed a signed slip, which is the only thing that
 * will buy a ballot; see lib/auth/ballot-token.
 */
export async function POST(request: NextRequest) {
  const auth = await requireStation(request);
  if ("response" in auth) return auth.response;

  let body: { indexNumber?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("That request wasn't readable.", 400);
  }

  const indexNumber = typeof body.indexNumber === "string" ? body.indexNumber.trim() : "";
  if (!indexNumber) return jsonError("No index number was sent.", 400);

  // A whole hall's worth of voting is a few hundred checks an hour; a
  // script working its way through index numbers is thousands.
  const perStation = await checkRateLimit(`ballot-verify:station:${auth.station.id}`, {
    max: 900,
    windowSeconds: 3600,
  });
  if (!perStation.allowed) return jsonError("This terminal has made too many checks. Call the commission.", 429);

  const perIndex = await checkRateLimit(`ballot-verify:index:${indexNumber.toUpperCase()}`, {
    max: 8,
    windowSeconds: 600,
  });
  if (!perIndex.allowed) return jsonError("That index number has been tried too many times. Wait a few minutes.", 429);

  const election = await getCurrentBallotElection();
  if (!election) {
    return NextResponse.json({ ok: true, status: "VOTING_CLOSED", phase: "CLOSED", notice: null });
  }

  const outcome = await verifyVoter({
    election,
    indexNumber,
    stationCode: auth.station.code,
  });

  return NextResponse.json({ ok: true, electionId: election.id, ...outcome });
}
