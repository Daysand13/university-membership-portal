import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { PatronLoginForm } from "@/components/forms/PatronLoginForm";
import { getCurrentPatron } from "@/lib/auth/patron";

export const metadata: Metadata = { title: "Patron Sign In" };

export default async function PatronLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordReset?: string }>;
}) {
  if (await getCurrentPatron()) redirect("/patrons/dashboard");
  const { passwordReset } = await searchParams;

  return (
    <div className="bg-surface-muted min-h-[70vh] flex items-center">
      <div className="mx-auto w-full max-w-md px-4 sm:px-6 py-14">
        <div className="text-center mb-7">
          <div className="w-12 h-12 rounded-full bg-primary-800 text-white flex items-center justify-center mx-auto mb-4">
            <Award size={22} aria-hidden="true" />
          </div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Patron Sign In</h1>
          <p className="text-sm text-slate mt-1.5">Sign in to the Patrons&apos; Portal with the email address you applied with.</p>
        </div>

        {passwordReset === "1" && (
          <div role="status" className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
            Your password has been changed. Sign in below with your new password.
          </div>
        )}
        <div className="bg-white rounded-lg border border-line p-6 sm:p-7">
          <PatronLoginForm />
          <div className="mt-6 pt-5 border-t border-line space-y-2 text-center text-sm">
            <p className="text-slate">
              Not a patron yet?{" "}
              <Link href="/patrons/register" className="font-semibold text-primary-800 hover:text-accent-600">
                Apply to become a patron
              </Link>
            </p>
            <p className="text-slate">
              Student or alumnus?{" "}
              <Link href="/login" className="font-semibold text-primary-800 hover:text-accent-600">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
