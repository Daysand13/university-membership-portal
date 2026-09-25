import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, FileText, Lock, Trash2 } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { getLetter, letterToInput } from "@/lib/services/letter-service";
import { formatCedis, hasPaidFor, priceOf } from "@/lib/services/document-purchase-service";
import { EMPTY_LETTER } from "@/lib/validations/letter";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { LetterForm } from "@/components/portal/LetterForm";
import { PayForLetterButton } from "@/components/portal/PayForLetterButton";
import { DeleteLetterButton } from "@/components/portal/DeleteLetterButton";
import { buttonClasses } from "@/components/ui/Button";

export const metadata = { title: "Letter" };
export const dynamic = "force-dynamic";

/**
 * One letter: write it, pay for it, download it.
 *
 * "new" is the same page with nothing in it, so there is one form to
 * learn rather than two.
 */
export default async function LetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string; saved?: string }>;
}) {
  const member = await requireMember();
  const { id } = await params;
  const { payment, saved } = await searchParams;

  const isNew = id === "new";
  const row = isNew ? null : await getLetter({ kind: "member", id: member.id }, id);
  if (!isNew && !row) notFound();

  const letter = row
    ? letterToInput(row)
    : {
        ...EMPTY_LETTER,
        // Their own details are already on file; nobody should have to
        // type their own name to write a letter.
        senderName: [member.firstName, member.middleName, member.lastName].filter(Boolean).join(" "),
        senderPhone: member.phone,
        senderEmail: member.email,
      };

  const paid = row
    ? await hasPaidFor({ kind: "member", id: member.id, email: member.email }, PaidDocumentKind.LETTER, {
        letterId: row.id,
      })
    : false;
  const price = formatCedis(priceOf(PaidDocumentKind.LETTER).pesewas);

  return (
    <>
      <Link
        href="/membership/dashboard/letters"
        className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4"
      >
        <ChevronLeft size={16} aria-hidden="true" /> My Letters
      </Link>

      <PortalPageHeader
        title={isNew ? "Write a letter" : letter.title}
        description="Fill in the parts. Where they go on the page is worked out for you."
      />

      {saved === "1" && (
        <p role="status" className="mb-6 rounded-lg border border-success bg-success-light px-4 py-3 text-sm text-ink">
          Saved. Read it through, and pay for it when you are happy with it.
        </p>
      )}
      {payment && (
        <p role="status" className="mb-6 rounded-lg border border-warning bg-warning-light px-4 py-3 text-sm text-ink">
          {payment}
        </p>
      )}

      {row && (
        <section
          aria-labelledby="letter-download-heading"
          className={`mb-6 rounded-xl border p-5 sm:p-6 ${paid ? "border-success bg-success-light/40" : "border-line bg-white shadow-card"}`}
        >
          <h2
            id="letter-download-heading"
            className="flex items-center gap-2 font-display font-bold text-lg text-primary-950"
          >
            {paid ? <FileText size={20} aria-hidden="true" /> : <Lock size={20} aria-hidden="true" />}
            {paid ? "This letter is ready to download" : `Download this letter — ${price}`}
          </h2>

          {paid ? (
            <>
              <p className="text-ink mt-2">
                Paid for. Change anything below and download it again as often as you like — there is nothing more to
                pay for this one.
              </p>
              <p className="mt-4">
                <a href={`/api/membership/letters/${row.id}`} className={buttonClasses("primary", "md")}>
                  <Download size={16} aria-hidden="true" /> Download (Word)
                </a>
              </p>
            </>
          ) : (
            <>
              <p className="text-ink mt-2">
                {price} for this letter. Writing and correcting it costs nothing — you pay when you want the laid-out
                Word copy.
              </p>
              <div className="mt-4">
                <PayForLetterButton letterId={row.id} amount={price} />
              </div>
              <p className="mt-3 text-sm text-slate">
                You can also pay at the association office and ask them to record it.
              </p>
            </>
          )}
        </section>
      )}

      <LetterForm letter={letter} letterId={row?.id ?? null} />

      {row && !paid && (
        <div className="mt-6">
          <DeleteLetterButton letterId={row.id} title={row.title} />
        </div>
      )}
      {row && paid && (
        <p className="mt-6 flex items-center gap-1.5 text-sm text-slate">
          <Trash2 size={14} aria-hidden="true" /> A letter you have paid for is kept, so you can always download it
          again.
        </p>
      )}
    </>
  );
}
