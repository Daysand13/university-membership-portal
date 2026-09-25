import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { listLetters } from "@/lib/services/letter-service";
import { formatCedis, priceOf } from "@/lib/services/document-purchase-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { EmptyState } from "@/components/ui/Common";
import { buttonClasses } from "@/components/ui/Button";

export const metadata = { title: "My Letters" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Accra",
});

/**
 * Letters a graduate has written.
 *
 * The same service as a student's, and charged the same way — per letter,
 * not by subscription. Graduates need these more often than students do:
 * job applications, references, transcripts chased up from departments.
 */
export default async function AlumniLettersPage({
  searchParams,
}: {
  searchParams: Promise<{ letter?: string }>;
}) {
  const alumnus = await requireAlumni();
  const { letter: notice } = await searchParams;

  const [letters, paidRows] = await Promise.all([
    listLetters({ kind: "alumni", id: alumnus.id }),
    db.documentPurchase.findMany({
      where: {
        alumniProfileId: alumnus.id,
        kind: PaidDocumentKind.LETTER,
        status: "SUCCESS",
        letterId: { not: null },
      },
      select: { letterId: true },
    }),
  ]);
  const paidIds = new Set(paidRows.map((row) => row.letterId));
  const price = formatCedis(priceOf(PaidDocumentKind.LETTER).pesewas);

  return (
    <>
      <PortalPageHeader
        title="My Letters"
        description="Write a letter in its parts and the association lays it out properly and hands it back as a Word document."
      />

      {notice && (
        <p role="status" className="mb-6 rounded-lg border border-warning bg-warning-light px-4 py-3 text-sm text-ink">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sm text-slate">
          {price} a letter. Writing and changing one costs nothing — you pay when you want the finished document.
        </p>
        <Link href="/alumni/letters/new" className={buttonClasses("primary", "md")}>
          <Plus size={16} aria-hidden="true" /> Write a letter
        </Link>
      </div>

      {letters.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} aria-hidden="true" />}
          title="No letters yet"
          description="Tell it who the letter is from, who it is to, and what you want to say. The arrangement is done for you."
        />
      ) : (
        <ul className="bg-white rounded-xl border border-line shadow-card divide-y divide-line">
          {letters.map((letter) => (
            <li key={letter.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <span className="min-w-0">
                <Link
                  href={`/alumni/letters/${letter.id}`}
                  className="block font-semibold text-primary-950 hover:text-accent-600 truncate"
                >
                  {letter.title}
                </Link>
                <span className="block text-sm text-slate truncate">
                  {letter.recipientName ? `To ${letter.recipientName}` : "No recipient yet"}
                  {letter.subject ? ` · ${letter.subject}` : ""} · changed {dateFormat.format(letter.updatedAt)}
                </span>
              </span>
              {paidIds.has(letter.id) ? (
                <a href={`/api/alumni/letters/${letter.id}`} className={buttonClasses("outline", "sm")}>
                  Download (Word)
                </a>
              ) : (
                <span className="text-sm text-slate">Draft</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
