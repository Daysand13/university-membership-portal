import type { Metadata } from "next";
import { UserPlus, LogIn } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Membership Portal" };

export default function MembershipLandingPage() {
  return (
    <div className="bg-white">
      <div className="bg-primary-950 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <SectionHeading kicker="Membership Portal" title="Join or Sign In" align="center" onDark />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-lg border border-line p-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-800 flex items-center justify-center mb-4">
            <UserPlus size={22} />
          </div>
          <h2 className="font-display font-bold text-lg text-primary-950">New Applicant</h2>
          <p className="text-sm text-slate mt-2 leading-relaxed">
            Not a member yet? Submit your membership application — our team will review it and follow up by
            email.
          </p>
          <LinkButton href="/membership/enroll" className="mt-6 w-full">
            Enroll for Membership
          </LinkButton>
        </div>

        <div className="rounded-lg border border-line p-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-800 flex items-center justify-center mb-4">
            <LogIn size={22} />
          </div>
          <h2 className="font-display font-bold text-lg text-primary-950">Existing Member</h2>
          <p className="text-sm text-slate mt-2 leading-relaxed">
            Already approved? Sign in with your index number to view your member dashboard.
          </p>
          <LinkButton href="/membership/login" variant="outline" className="mt-6 w-full">
            Member Login
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
