import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { findSignupByToken } from "@/lib/services/ally-service";
import { confirmAllyAction } from "@/lib/actions/public-outreach-actions";
import { TokenActionPanel } from "@/components/outreach/AllyForms";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Where the confirmation email's link lands. It shows a button rather than
 * confirming on arrival: mail providers open links to scan them, and that
 * scan mustn't count as the person saying yes.
 */
export default async function ConfirmAllyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const signup = await findSignupByToken(token);
  const alreadyConfirmed = Boolean(signup?.confirmedAt && !signup.unsubscribedAt);

  return (
    <div className="bg-surface-muted">
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-16">
        <div className="rounded-xl bg-white border border-line shadow-card p-8 text-center">
          <MailCheck size={34} aria-hidden="true" className="mx-auto text-primary-800" />
          <h1 className="mt-4 font-display font-bold text-2xl text-primary-950">Join the ally network</h1>

          {!signup ? (
            <p className="mt-3 text-slate">
              This link isn&apos;t valid any more — it may have been replaced by a newer one.{" "}
              <Link href="/allies#join" className="font-semibold text-primary-800 underline">
                Sign up again
              </Link>{" "}
              and we&apos;ll send a fresh link.
            </p>
          ) : alreadyConfirmed ? (
            <p className="mt-3 text-slate">
              You&apos;re already confirmed, {signup.fullName.split(" ")[0]}. Thank you for standing with us.
            </p>
          ) : (
            <>
              <p className="mt-3 mb-6 text-slate">
                Confirm that <span className="font-semibold text-primary-950">{signup.email}</span> is yours, and
                you&apos;ll start receiving updates and advocacy alerts.
              </p>
              <TokenActionPanel
                action={confirmAllyAction.bind(null, token)}
                label="Confirm my email"
                doneTitle="You're in — thank you"
                doneText="You'll hear from us when there's news, a campaign to back, or a way to help. Every email has an unsubscribe link."
              />
            </>
          )}

          <p className="mt-8">
            <Link href="/allies" className="text-sm font-semibold text-primary-800 hover:text-accent-600">
              Back to Allies &amp; Champions
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
