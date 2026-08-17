import type { Metadata } from "next";
import { CalendarClock, Vote, Megaphone } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getCurrentPublishedElection } from "@/lib/services/election-service";

export const metadata: Metadata = { title: "Elections" };
export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "To be announced";
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default async function ElectionsPage() {
  const election = await getCurrentPublishedElection();

  return (
    <div className="bg-white">
      <div className="bg-primary-950 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <SectionHeading kicker="Student Leadership" title="Elections" align="center" onDark />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        {election ? (
          <>
            <h2 className="font-display font-bold text-2xl text-primary-950">{election.title}</h2>
            {election.description && (
              <p className="mt-3 text-slate leading-relaxed whitespace-pre-line">{election.description}</p>
            )}

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-line bg-surface-muted p-5">
                <p className="kicker mb-2">Nominations</p>
                <p className="text-sm font-medium text-primary-950">
                  {formatDate(election.nominationStart)} – {formatDate(election.nominationEnd)}
                </p>
              </div>
              <div className="rounded-lg border border-line bg-surface-muted p-5">
                <p className="kicker mb-2">Voting Date</p>
                <p className="text-sm font-medium text-primary-950">{formatDate(election.votingDate)}</p>
              </div>
              <div className="rounded-lg border border-line bg-surface-muted p-5">
                <p className="kicker mb-2">Method / Venue</p>
                <p className="text-sm font-medium text-primary-950">{election.venueOrMethod || "To be announced"}</p>
              </div>
            </div>

            {election.candidates.length > 0 && (
              <div className="mt-10">
                <h3 className="font-display font-bold text-lg text-primary-950 mb-4">Candidates</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {election.candidates.map((candidate) => (
                    <div key={candidate.id} className="rounded-lg border border-line p-4 flex gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-primary-50 shrink-0 overflow-hidden flex items-center justify-center text-primary-300">
                        {candidate.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={candidate.photoUrl} alt={candidate.name} className="w-full h-full object-cover" />
                        ) : (
                          <Vote size={18} />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-primary-950 text-sm">{candidate.name}</p>
                        <p className="text-xs text-slate">{candidate.position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {election.resultsSummary && (
              <div className="mt-10 rounded-lg border border-accent-200 bg-accent-100/40 p-6">
                <p className="kicker mb-2">Results</p>
                <p className="text-sm text-primary-950 whitespace-pre-line">{election.resultsSummary}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Megaphone size={32} className="mx-auto text-primary-200 mb-4" />
            <h2 className="font-display font-bold text-xl text-primary-950">
              Elections are held periodically
            </h2>
            <p className="mt-3 text-slate leading-relaxed max-w-lg mx-auto">
              Stay tuned for official announcements, nomination information, candidate details, voting dates,
              and results. This page will be updated as soon as the next election cycle is announced.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-slate">
              <CalendarClock size={15} /> No active election at this time
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
