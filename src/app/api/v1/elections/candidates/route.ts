import { NextResponse, type NextRequest } from "next/server";
import { requireStation } from "@/lib/api/station-request";
import { getBallotPaper, getCurrentBallotElection } from "@/lib/services/election-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The ballot paper: the portfolios in the order they are voted on, and the
 * candidates the commission has approved for each.
 *
 * A terminal fetches this when it starts and keeps it, so a hall that
 * loses its line mid-morning can carry on taking votes from what it
 * already holds.
 */
export async function GET(request: NextRequest) {
  const auth = await requireStation(request);
  if ("response" in auth) return auth.response;

  const election = await getCurrentBallotElection();
  if (!election) return NextResponse.json({ ok: true, election: null, positions: [] });

  const positions = await getBallotPaper(election.id);
  return NextResponse.json({
    ok: true,
    election: { id: election.id, title: election.title },
    positions: positions.map((position) => ({
      id: position.id,
      title: position.title,
      order: position.order,
      candidates: position.candidates,
    })),
  });
}
