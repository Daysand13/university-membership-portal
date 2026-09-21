import { NextResponse, type NextRequest } from "next/server";
import { requireStation } from "@/lib/api/station-request";
import { getCurrentBallotElection } from "@/lib/services/election-service";
import { effectivePhase } from "@/lib/election-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What the terminals ask every half-minute: when does voting close, and is
 * it still on.
 *
 * This is how an extension or a postponement reaches a hall without anyone
 * touching the machine there. It answers with the server's own time as
 * well, so a terminal whose clock is an hour out still counts down to the
 * right moment — it measures from the difference, not from its own idea of
 * now.
 */
export async function GET(request: NextRequest) {
  const auth = await requireStation(request);
  if ("response" in auth) return auth.response;

  const election = await getCurrentBallotElection();
  const serverTime = new Date().toISOString();

  if (!election) {
    return NextResponse.json({ ok: true, serverTime, election: null });
  }

  return NextResponse.json({
    ok: true,
    serverTime,
    election: {
      id: election.id,
      title: election.title,
      phase: effectivePhase(election),
      opensAt: election.votingOpensAt?.toISOString() ?? null,
      closesAt: election.votingClosesAt?.toISOString() ?? null,
      notice: election.noticeText,
      resultsPublic: election.resultsPublic,
    },
  });
}
