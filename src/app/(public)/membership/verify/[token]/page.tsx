import type { Metadata } from "next";
import { CheckCircle2, User, XCircle } from "lucide-react";
import { getMemberForCardVerification } from "@/lib/services/member-card-service";
import { formatFullName } from "@/lib/format";

export const metadata: Metadata = {
  title: "Verify Membership",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Where a membership card's QR code leads: confirms, for whoever scanned it,
 * whether the card belongs to a current member. Shows only what a printed
 * card would (see member-card-service.ts), and for a code that doesn't
 * check out, says nothing about whose it might have been.
 */
export default async function VerifyMembershipPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const member = await getMemberForCardVerification(decodeURIComponent(token));
  const isCurrentMember = member !== null && member.status === "ACTIVE" && !member.graduatedAt;

  return (
    <div className="bg-surface-muted min-h-[70vh] flex items-center">
      <div className="mx-auto w-full max-w-md px-4 sm:px-6 py-14">
        {isCurrentMember ? (
          <div className="bg-white rounded-xl border border-success shadow-card p-7 text-center">
            <CheckCircle2 size={40} className="mx-auto text-success" aria-hidden="true" />
            <h1 className="font-display font-bold text-2xl text-primary-950 mt-3">Current Member</h1>
            <p className="text-slate mt-1">This membership card is valid.</p>

            <div className="mt-6 w-28 h-28 rounded-full overflow-hidden mx-auto bg-primary-50 border border-line flex items-center justify-center">
              {member.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.profileImageUrl} alt={`Photo of ${member.firstName}`} className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-primary-300" aria-hidden="true" />
              )}
            </div>
            <dl className="mt-5 space-y-3">
              <div>
                <dt className="text-sm text-slate">Name</dt>
                <dd className="font-semibold text-lg text-primary-950">
                  {formatFullName(member.firstName, member.middleName, member.lastName)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate">Index Number</dt>
                <dd className="font-data font-semibold text-primary-950">{member.indexNumber}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate">Membership Status</dt>
                <dd className="font-semibold text-success">Active</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-danger shadow-card p-7 text-center">
            <XCircle size={40} className="mx-auto text-danger" aria-hidden="true" />
            <h1 className="font-display font-bold text-2xl text-primary-950 mt-3">Not Verified</h1>
            <p className="text-slate mt-2 leading-relaxed">
              This code doesn&apos;t belong to a current membership. It may have expired at the end of the academic
              year, or the membership may no longer be active. Ask the member to open their Student Portal and show
              the code there.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
