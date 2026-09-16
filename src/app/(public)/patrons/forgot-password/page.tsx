import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { PatronForgotPasswordForm } from "@/components/forms/PatronPasswordResetForms";

export const metadata: Metadata = { title: "Forgot Patron Password" };

export default function PatronForgotPasswordPage() {
  return (
    <div className="bg-surface-muted min-h-[70vh] flex items-center">
      <div className="mx-auto w-full max-w-md px-4 sm:px-6 py-14">
        <div className="text-center mb-7">
          <div className="w-12 h-12 rounded-full bg-primary-800 text-white flex items-center justify-center mx-auto mb-4">
            <KeyRound size={22} aria-hidden="true" />
          </div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Forgot Your Password?</h1>
          <p className="text-sm text-slate mt-1.5">
            Enter the email address you applied with, and we&apos;ll send you a link to choose a new password.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-line p-6 sm:p-7">
          <PatronForgotPasswordForm />
          <p className="mt-6 pt-5 border-t border-line text-center text-sm">
            <Link href="/patrons/login" className="font-semibold text-primary-800 hover:text-accent-600">
              Back to Patron Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
