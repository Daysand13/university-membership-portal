import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = { title: "Postgraduate Membership Registration" };

export default function PostgraduateEnrollPage() {
  return (
    <div className="bg-surface-muted">
      <div className="bg-white border-b border-line">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
          <SectionHeading
            kicker="Membership Application"
            title="Postgraduate Membership Registration"
            description="For postgraduate (Masters / PhD) students with special needs."
          />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg border border-dashed border-line p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-primary-50 text-primary-800 flex items-center justify-center mx-auto mb-5">
            <GraduationCap size={24} />
          </div>
          <h2 className="font-display font-bold text-xl text-primary-950 mb-2">Coming Soon</h2>
          <p className="text-sm text-slate leading-relaxed max-w-md mx-auto">
            The postgraduate registration form is being finalized and will be available here shortly. In the
            meantime, please visit the Resource Center for Students with Special Needs (FES Block, Room 104) to
            register your status, or contact the association for guidance.
          </p>
          <Link
            href="/membership/enroll"
            className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-primary-800 hover:text-accent-600"
          >
            <ArrowLeft size={14} /> Back to membership options
          </Link>
        </div>
      </div>
    </div>
  );
}
