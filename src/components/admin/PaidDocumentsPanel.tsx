import { db } from "@/lib/db";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { formatCedis, hasPaidFor, paidUntil, priceOf } from "@/lib/services/document-purchase-service";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { recordCashAlumniCvPaymentAction, recordCashCvPaymentAction } from "@/lib/actions/cv-actions";
import {
  recordCashAlumniLetterPaymentAction,
  recordCashLetterPaymentAction,
} from "@/lib/actions/letter-actions";

/**
 * Taking money at the desk for the documents the association prepares.
 *
 * Nearly everybody here pays over the counter, so this is not a fallback:
 * it is the main way a CV or a letter gets paid for, and an officer needs
 * to be able to do it from the person's own record without hunting for a
 * reference number.
 *
 * One panel for members and graduates both, because the desk does not
 * think of them as two different jobs.
 */

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-semibold text-primary-950 hover:bg-surface-muted";

export async function PaidDocumentsPanel({
  owner,
  name,
}: {
  owner: { kind: "member" | "alumni"; id: string; email: string };
  name: string;
}) {
  const cvPrice = priceOf(PaidDocumentKind.CV);
  const letterPrice = priceOf(PaidDocumentKind.LETTER);
  const isMember = owner.kind === "member";

  const [cvPaid, cvUntil, letters, paidLetterRows] = await Promise.all([
    hasPaidFor(owner, PaidDocumentKind.CV),
    paidUntil(owner, PaidDocumentKind.CV),
    db.memberLetter.findMany({
      where: isMember ? { memberId: owner.id } : { alumniProfileId: owner.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, recipientName: true },
    }),
    db.documentPurchase.findMany({
      where: {
        ...(isMember ? { memberId: owner.id } : { alumniProfileId: owner.id }),
        kind: PaidDocumentKind.LETTER,
        status: "SUCCESS",
        letterId: { not: null },
      },
      select: { letterId: true },
    }),
  ]);

  const paidLetterIds = new Set(paidLetterRows.map((row) => row.letterId));
  const recordCv = isMember
    ? recordCashCvPaymentAction.bind(null, owner.id)
    : recordCashAlumniCvPaymentAction.bind(null, owner.id);
  const recordLetter = isMember ? recordCashLetterPaymentAction : recordCashAlumniLetterPaymentAction;

  return (
    <div className="bg-white rounded-lg border border-line p-4 sm:p-6 mb-6">
      <h2 className="font-display font-bold text-base text-primary-950 mb-4">Paid documents</h2>

      <section aria-labelledby="paid-cv-heading" className="mb-6">
        <h3 id="paid-cv-heading" className="text-sm font-semibold text-primary-950 mb-2">
          CV
        </h3>
        {cvPaid ? (
          <p className="text-sm text-ink">
            {name} has paid for their CV{cvUntil ? `, until ${dateFormat.format(cvUntil)}` : ""}. They can write it and
            download it from their own dashboard, as often as they like
            {cvUntil ? " until then" : ""}.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate mb-3">
              A CV costs {formatCedis(cvPrice.pesewas)}
              {isMember ? ", once" : " a year for graduates"}. Record it here when the money is handed over at the
              office — online payment does the same thing by itself.
            </p>
            <ConfirmButton
              action={recordCv}
              confirmMessage={`Record ${formatCedis(cvPrice.pesewas)} in cash for this CV? It unlocks the download straight away.`}
              className={buttonClass}
            >
              Record cash payment for a CV
            </ConfirmButton>
          </>
        )}
      </section>

      <section aria-labelledby="paid-letters-heading">
        <h3 id="paid-letters-heading" className="text-sm font-semibold text-primary-950 mb-2">
          Letters
        </h3>
        {letters.length === 0 ? (
          <p className="text-sm text-slate">
            {name} hasn&apos;t written any letters yet. A letter costs {formatCedis(letterPrice.pesewas)} each, and
            they appear here to be paid for once written.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate mb-3">
              {formatCedis(letterPrice.pesewas)} a letter — each one is paid for separately.
            </p>
            <ul className="divide-y divide-line border border-line rounded-md">
              {letters.map((letter) => (
                <li key={letter.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-primary-950 break-words">{letter.title}</span>
                    <span className="block text-xs text-slate break-words">
                      {letter.recipientName ? `To ${letter.recipientName}` : "No recipient yet"}
                    </span>
                  </span>
                  {paidLetterIds.has(letter.id) ? (
                    <span className="text-xs font-semibold text-success shrink-0">Paid</span>
                  ) : (
                    <ConfirmButton
                      action={recordLetter.bind(null, owner.id, letter.id)}
                      confirmMessage={`Record ${formatCedis(letterPrice.pesewas)} in cash for “${letter.title}”? It unlocks the download straight away.`}
                      className={buttonClass}
                    >
                      Record cash payment
                    </ConfirmButton>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
