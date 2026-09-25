import { notFound } from "next/navigation";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getCampaign, splitEndorsements, type SignatureLine } from "@/lib/services/advocacy-service";
import { getEmailBrand } from "@/lib/services/content-service";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Endorsement Sheet" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" });

/** One signature table on the printed sheet. */
function SignatureTable({
  lines,
  who,
  columnLabel,
  verb,
}: {
  lines: SignatureLine[];
  who: string;
  columnLabel: string;
  verb: string;
}) {
  return (
    <table className="mt-4 w-full text-sm border-collapse">
      {/* A sheet meant for paper, but the page it is printed from is read
          on screen first. */}
      <caption className="sr-only">{` — `}</caption>
      <thead>
        <tr className="text-left border-b border-[#c3c9d2]">
          <th scope="col" className="py-2 pr-3 w-8">#</th>
          <th scope="col" className="py-2 pr-3">{who}</th>
          <th scope="col" className="py-2 pr-3">{columnLabel}</th>
          <th scope="col" className="py-2">{verb}</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, i) => (
          <tr key={line.id} className="border-b border-[#e2e8f0] align-top break-inside-avoid">
            <td className="py-2.5 pr-3">{i + 1}</td>
            <td className="py-2.5 pr-3">
              <p className="font-semibold">{line.name}</p>
              {line.comment && <p className="mt-1 italic text-[#5b6b7c]">&ldquo;{line.comment}&rdquo;</p>}
            </td>
            <td className="py-2.5 pr-3">{line.description}</td>
            <td className="py-2.5 whitespace-nowrap">{dateFormat.format(line.at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * A printable record of the patrons who endorsed a campaign — the "seal"
 * the executive takes into a meeting with university management. Outside
 * the admin frame so it prints as a clean page.
 */
export default async function EndorsementSheetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("members.alumni");
  const { id } = await params;
  const [campaign, brand] = await Promise.all([getCampaign(id), getEmailBrand()]);
  if (!campaign) notFound();
  const { patrons, alumni } = splitEndorsements(campaign.endorsements);

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

      {patrons.length > 0 && (
        <section className="mt-8">
          <p className="leading-relaxed">
            The following patrons of the association have formally endorsed this campaign ({patrons.length} in total):
          </p>
          <SignatureTable lines={patrons} who="Patron" columnLabel="Position" verb="Endorsed" />
        </section>
      )}

      {alumni.length > 0 && (
        <section className="mt-8">
          <p className="leading-relaxed">
            {alumni.length} graduate{alumni.length === 1 ? " of" : "s of"} the association {alumni.length === 1 ? "has" : "have"}{" "}
            co-signed it:
          </p>
          <SignatureTable lines={alumni} who="Alumnus" columnLabel="Class & role" verb="Signed" />
        </section>
      )}

      <footer className="mt-10 text-xs text-[#5b6b7c]">
        Generated {dateFormat.format(new Date())} from the {brand.siteTitle} portals. Every signature above was made by
        that person themselves, from their own account.
      </footer>
    </main>
  );
}
