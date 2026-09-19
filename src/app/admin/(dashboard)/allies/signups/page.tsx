import Link from "next/link";
import { Check, UserPlus } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { countAllySignups, listAllySignups } from "@/lib/services/ally-service";
import { markAllySignupReviewedAction } from "@/lib/actions/outreach-admin-actions";
import { AlliesSectionNav } from "@/components/admin/OutreachSectionNav";
import { EmptyState } from "@/components/ui/Common";

export const metadata = { title: "Ally Sign-ups" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });

function emailState(signup: { confirmedAt: Date | null; unsubscribedAt: Date | null }): { label: string; tone: string } {
  if (signup.unsubscribedAt) return { label: "Unsubscribed", tone: "bg-slate-100 text-slate-500" };
  if (signup.confirmedAt) return { label: "Confirmed", tone: "bg-success-light text-success" };
  return { label: "Not confirmed yet", tone: "bg-warning-light text-warning" };
}

/**
 * Everyone who joined from the public Allies page. Only confirmed addresses
 * receive broadcasts; only an administrator can put someone on the page.
 */
export default async function AllySignupsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireAdminRole(AdminRole.EDITOR, AdminRole.MEMBERSHIP_OFFICER);
  const { show } = await searchParams;
  const filter = show === "listing" ? "listing" : "all";
  const [signups, counts] = await Promise.all([listAllySignups(filter), countAllySignups()]);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-4">Allies &amp; Champions</h1>
      <AlliesSectionNav current="signups" />

      <p className="text-sm text-slate mb-5 max-w-3xl">
        {counts.confirmed} confirmed {counts.confirmed === 1 ? "ally receives" : "allies receive"} broadcasts sent to
        the Ally Network. People who haven&apos;t clicked their confirmation link yet get nothing.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {[
          { value: "all", label: `Everyone (${counts.total})` },
          { value: "listing", label: `Asked to be listed (${counts.awaitingListing})` },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/allies/signups?show=${tab.value}`}
            aria-current={filter === tab.value ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              filter === tab.value ? "bg-primary-800 text-white border-primary-800" : "border-line text-slate hover:border-primary-300"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {signups.length === 0 ? (
        <EmptyState icon={<UserPlus size={28} />} title="Nothing here yet" description="Sign-ups from the Allies page appear here." />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Person</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Joining as</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Email</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Listing</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Joined</th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {signups.map((signup) => {
                const email = emailState(signup);
                const canList = signup.wantsListing && signup.confirmedAt && !signup.ally;
                return (
                  <tr key={signup.id} className="align-top hover:bg-surface-muted/60">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-primary-950">{signup.fullName}</p>
                      <a href={`mailto:${signup.email}`} className="text-xs text-slate hover:text-accent-600 break-all">
                        {signup.email}
                      </a>
                      {signup.organization && <p className="text-xs text-slate">{signup.organization}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-slate">{signup.type === "CORPORATE" ? "Organisation" : "Individual"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${email.tone}`}>{email.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate">
                      {signup.ally ? (
                        <Link href={`/admin/allies/${signup.ally.id}`} className="font-semibold text-primary-800 hover:text-accent-600">
                          Listed
                        </Link>
                      ) : signup.wantsListing ? (
                        signup.status === "REVIEWED" ? "Asked · reviewed" : "Asked to be listed"
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate whitespace-nowrap">{dateFormat.format(signup.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap justify-end gap-2">
                        {canList && (
                          <Link
                            href={`/admin/allies/new?fromSignup=${signup.id}`}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-900"
                          >
                            List publicly
                          </Link>
                        )}
                        {signup.status === "NEW" && (
                          <form action={markAllySignupReviewedAction.bind(null, signup.id)}>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-primary-950 hover:bg-surface-muted"
                            >
                              <Check size={13} aria-hidden="true" /> Mark reviewed
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
