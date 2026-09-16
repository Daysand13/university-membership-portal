import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PatronRegisterForm } from "@/components/forms/PatronRegisterForm";

export const metadata: Metadata = { title: "Apply to Become a Patron" };

export default function PatronRegisterPage() {
  return (
    <div className="bg-surface-muted">
      <div className="bg-white border-b border-line">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
          <SectionHeading
            kicker="Patrons"
            title="Apply to Become a Patron"
            description="Tell us about yourself and your work. Our team reviews every application and will email you with the decision — once approved, you can sign in to the Patrons' Portal."
          />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <PatronRegisterForm />
      </div>
    </div>
  );
}
