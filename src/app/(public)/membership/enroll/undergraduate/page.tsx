import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EnrollmentForm } from "@/components/forms/EnrollmentForm";

export const metadata: Metadata = { title: "Undergraduate Membership Registration" };

export default function UndergraduateEnrollPage() {
  return (
    <div className="bg-surface-muted">
      <div className="bg-white border-b border-line">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
          <SectionHeading
            kicker="Membership Application"
            title="Student Membership Registration"
            description="Undergraduate students only. Fill in your details below — your application will be reviewed by our membership team, and you'll be notified by email once a decision is made."
          />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        <EnrollmentForm track="UNDERGRADUATE" />
      </div>
    </div>
  );
}
