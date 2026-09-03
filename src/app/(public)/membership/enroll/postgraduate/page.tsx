import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EnrollmentForm } from "@/components/forms/EnrollmentForm";

export const metadata: Metadata = { title: "Postgraduate Membership Registration" };

export default function PostgraduateEnrollPage() {
  return (
    <div className="bg-surface-muted">
      <div className="bg-white border-b border-line">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
          <SectionHeading
            kicker="Membership Application"
            title="Postgraduate Membership Registration"
            description="For postgraduate (Masters / PhD) students. Fill in your details below — your application will be reviewed by our membership team, and you'll be notified by email once a decision is made."
          />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        <EnrollmentForm track="POSTGRADUATE" />
      </div>
    </div>
  );
}
