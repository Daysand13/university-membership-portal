import { NextResponse, type NextRequest } from "next/server";
import { requireStation } from "@/lib/api/station-request";
import { getCurrentBallotElection } from "@/lib/services/election-service";
import { getEmailBrand } from "@/lib/services/content-service";
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

  const [election, brand] = await Promise.all([getCurrentBallotElection(), getEmailBrand()]);
  const serverTime = new Date().toISOString();

  // Who the terminals are standing in for. Sent with every schedule check
  // so a hall's machines carry the association's own mark and name rather
  // than something built into the software, and so changing the logo in
  // Settings reaches them without anybody reinstalling anything.
  const association = { name: brand.siteTitle, logoUrl: brand.logoUrl ?? null };

  if (!election) {
    return NextResponse.json({ ok: true, serverTime, association, election: null });
  }

  return NextResponse.json({
    ok: true,
    serverTime,
    association,
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
