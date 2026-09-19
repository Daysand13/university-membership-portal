import type { Metadata } from "next";
import Link from "next/link";
import { MailX } from "lucide-react";
import { findSignupByToken } from "@/lib/services/ally-service";
import { unsubscribeAllyAction } from "@/lib/actions/public-outreach-actions";
import { TokenActionPanel } from "@/components/outreach/AllyForms";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

/** The unsubscribe link in every email to an ally. One button, no questions. */
export default async function UnsubscribeAllyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const signup = await findSignupByToken(token);

  return (
    <div className="bg-surface-muted">
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-16">
        <div className="rounded-xl bg-white border border-line shadow-card p-8 text-center">
          <MailX size={34} aria-hidden="true" className="mx-auto text-primary-800" />
          <h1 className="mt-4 font-display font-bold text-2xl text-primary-950">Unsubscribe</h1>

          {!signup ? (
            <p className="mt-3 text-slate">This link isn&apos;t valid any more.</p>
          ) : signup.unsubscribedAt ? (
            <p className="mt-3 text-slate">
              <span className="font-semibold text-primary-950">{signup.email}</span> is already unsubscribed. You
              won&apos;t receive any more emails from the ally network.
            </p>
          ) : (
            <>
              <p className="mt-3 mb-6 text-slate">
                Stop emails from the ally network to{" "}
                <span className="font-semibold text-primary-950">{signup.email}</span>?
              </p>
              <TokenActionPanel
                action={unsubscribeAllyAction.bind(null, token)}
                label="Unsubscribe me"
                doneTitle="You've been unsubscribed"
                doneText="You won't receive any more emails from us. Thank you for your support — you're welcome back any time."
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
