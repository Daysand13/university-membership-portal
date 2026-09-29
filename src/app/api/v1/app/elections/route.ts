import { type NextRequest } from "next/server";
import { appJson } from "@/lib/api/app-request";
import { getCurrentPublishedElection, tallyElection } from "@/lib/services/election-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The election, to read.
 *
 * Read, and nothing else. No ballot is ever cast from a phone: ASSN
 * Ballot was built around a supervised terminal — a registered station, a
 * key an officer types in, a voter checked at the desk — and a personal
 * phone has none of that. Members can see who is standing, and the result
 * once the commission publishes it.
 *
 * Results only exist here when `resultsPublic` is set, which is the
 * commission's switch. Until they throw it, this says there are none, and
 * the counts are not fetched at all.
 */
/**
 * Said on every reply, including when there is no election at all.
 *
 * Leaving it off the empty case meant the app read `undefined` and had to
 * decide for itself what that meant — about voting, of all things.
 */
const NEVER_IN_APP = {
  votingInApp: false,
  votingNotice: "Voting happens at a polling terminal supervised by the Electoral Commission, not in the app.",
} as const;

export async function GET(_request: NextRequest) {
  const election = await getCurrentPublishedElection();
  if (!election) return appJson({ election: null, results: null, ...NEVER_IN_APP });

  const results = election.resultsPublic ? await tallyElection(election.id) : null;

  return appJson({
    election: {
      id: election.id,
      title: election.title,
      description: election.description,
      phase: election.phase,
      votingOpensAt: election.votingOpensAt?.toISOString() ?? null,
      votingClosesAt: election.votingClosesAt?.toISOString() ?? null,
      resultsPublic: election.resultsPublic,
      candidates: election.candidates
        .filter((candidate) => candidate.status === "APPROVED")
        .map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          position: candidate.position,
          photoUrl: candidate.photoUrl,
          manifesto: candidate.manifesto,
        })),
    },
    results,
    ...NEVER_IN_APP,
  });
}
