import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Application Submitted" };

export default function EnrollSuccessPage() {
  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-success-light text-success flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={32} />
      </div>
      <h1 className="font-display font-bold text-2xl text-primary-950">Application Submitted</h1>
      <p className="mt-3 text-slate leading-relaxed">
        Thank you for applying for membership. We&apos;ve emailed you a confirmation, and your application is
        now with our membership team for review. You&apos;ll receive another email as soon as a decision has
        been made — there&apos;s nothing further you need to do right now.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <LinkButton href="/" variant="outline">
          Back to Homepage
        </LinkButton>
        <LinkButton href="/news">Read the Latest News</LinkButton>
      </div>
    </div>
  );
}
