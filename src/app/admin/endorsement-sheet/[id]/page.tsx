import { notFound } from "next/navigation";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getCampaign } from "@/lib/services/advocacy-service";
import { getEmailBrand } from "@/lib/services/content-service";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Endorsement Sheet" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" });

/**
 * A printable record of the patrons who endorsed a campaign — the "seal"
 * the executive takes into a meeting with university management. Outside
 * the admin frame so it prints as a clean page.
 */
export default async function EndorsementSheetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const { id } = await params;
  const [campaign, brand] = await Promise.all([getCampaign(id), getEmailBrand()]);
  if (!campaign) notFound();

  return (
    // A fixed light page in both themes: it is made to be printed.
    <main className="mx-auto max-w-3xl px-6 py-10 print:py-0" style={{ backgroundColor: "#ffffff", color: "#131b23" }}>
      <div className="flex justify-end mb-6">
        <PrintButton />
      </div>

      <header className="flex items-center gap-4 border-b-2 border-[#24266b] pb-4">
        {brand.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} alt="" className="w-16 h-16 object-contain" />
        )}
        <div>
          <p className="text-lg font-bold text-[#24266b]">{brand.siteTitle}</p>
          <p className="text-sm text-[#5b6b7c]">Official Patron Endorsements</p>
        </div>
      </header>

      <section className="mt-6">
        <h1 className="text-2xl font-bold text-[#14153d]">{campaign.title}</h1>
        {(campaign.initiatedBy || campaign.targetBody) && (
          <p className="text-sm text-[#5b6b7c] mt-1">
            {[campaign.initiatedBy && `Initiated by ${campaign.initiatedBy}`, campaign.targetBody && `Addressed to ${campaign.targetBody}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <p className="mt-4 leading-relaxed">{campaign.summary}</p>
      </section>

      <section className="mt-8">
        <p className="leading-relaxed">
          The following patrons of the association have formally endorsed this campaign
          ({campaign.endorsements.length} in total):
        </p>
        <table className="mt-4 w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-[#c3c9d2]">
              <th scope="col" className="py-2 pr-3 w-8">#</th>
              <th scope="col" className="py-2 pr-3">Patron</th>
              <th scope="col" className="py-2 pr-3">Position</th>
              <th scope="col" className="py-2">Endorsed</th>
            </tr>
          </thead>
          <tbody>
            {campaign.endorsements.map((e, i) => (
              <tr key={e.id} className="border-b border-[#e2e8f0] align-top break-inside-avoid">
                <td className="py-2.5 pr-3">{i + 1}</td>
                <td className="py-2.5 pr-3">
                  <p className="font-semibold">{[e.patron.title, e.patron.fullName].filter(Boolean).join(" ")}</p>
                  {e.comment && <p className="mt-1 italic text-[#5b6b7c]">&ldquo;{e.comment}&rdquo;</p>}
                </td>
                <td className="py-2.5 pr-3">
                  {[e.patron.jobTitle, e.patron.organization].filter(Boolean).join(", ") || e.patron.occupation}
                </td>
                <td className="py-2.5 whitespace-nowrap">{dateFormat.format(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-10 text-xs text-[#5b6b7c]">
        Generated {dateFormat.format(new Date())} from the {brand.siteTitle} Patrons&apos; Portal. Each endorsement was
        made by the patron personally from their own account.
      </footer>
    </main>
  );
}
