import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { PatronResetPasswordForm } from "@/components/forms/PatronPasswordResetForms";
import { isPatronResetLinkValid } from "@/lib/services/patron-service";

export const metadata: Metadata = { title: "Reset Patron Password" };

export default async function PatronResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token: rawToken } = await searchParams;
  const token = typeof rawToken === "string" ? rawToken : "";
  // Checked before showing the form, so someone with an expired or used link
  // is told straight away instead of after typing a new password twice.
  const valid = token ? await isPatronResetLinkValid(token) : false;

  return (
    <div className="bg-surface-muted min-h-[70vh] flex items-center">
      <div className="mx-auto w-full max-w-md px-4 sm:px-6 py-14">
        <div className="text-center mb-7">
          <div className="w-12 h-12 rounded-full bg-primary-800 text-white flex items-center justify-center mx-auto mb-4">
            <KeyRound size={22} aria-hidden="true" />
          </div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Choose a New Password</h1>
          <p className="text-sm text-slate mt-1.5">For your Patrons&apos; Portal account.</p>
        </div>
        <div className="bg-white rounded-lg border border-line p-6 sm:p-7">
          {valid ? (
            <PatronResetPasswordForm token={token} />
          ) : (
            <div role="alert" className="text-center space-y-4">
              <p className="text-sm text-ink leading-relaxed">
                This password reset link is invalid, has expired, or has already been used. Reset links work once,
                for 30 minutes.
              </p>
              <Link
                href="/patrons/forgot-password"
                className="inline-flex items-center justify-center rounded-md bg-primary-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-900"
              >
                Request a New Link
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
