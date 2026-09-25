import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { verifyAndRecordPurchase } from "@/lib/services/document-purchase-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { buttonClasses } from "@/components/ui/Button";

export const metadata = { title: "Nomination form" };
export const dynamic = "force-dynamic";

/**
 * Where Paystack sends somebody back to.
 *
 * The payment is confirmed with Paystack here rather than taken on trust
 * from the address bar — and the webhook does the same thing independently,
 * so a member who closes the tab on the way back still gets what they paid
 * for.
 */
export default async function NominationFormPaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  await requireMember();
  const { reference, trxref } = await searchParams;
  const ref = reference || trxref;

  const outcome = ref ? await verifyAndRecordPurchase(ref) : { ok: false as const, error: "No payment reference came back." };
  const settled = outcome.ok && outcome.status === "SUCCESS";

  return (
    <>
      <PortalPageHeader title="Nomination form" description="What happened to your payment." />

      <section className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6 max-w-2xl">
        <h2 className="flex items-center gap-2 font-display font-bold text-lg text-primary-950">
          {settled ? (
            <CheckCircle2 size={20} aria-hidden="true" className="text-success" />
          ) : (
            <XCircle size={20} aria-hidden="true" className="text-danger" />
          )}
          {settled ? "Paid — the form is yours" : "That payment didn't go through"}
        </h2>
        <p className="text-ink mt-2">
          {settled
            ? "You can fill in your nomination and put your name forward now."
            : outcome.ok
              ? "Paystack reported the payment as unsuccessful, so nothing has been charged and the form has not been issued. You can try again."
              : outcome.error}
        </p>
        <p className="mt-5">
          <Link href="/membership/dashboard/elections" className={buttonClasses("primary", "md")}>
            Back to the election
          </Link>
        </p>
      </section>
    </>
  );
}
