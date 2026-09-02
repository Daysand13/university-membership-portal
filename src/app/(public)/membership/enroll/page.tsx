import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, School, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = { title: "Enroll for Membership" };

export default function EnrollChooserPage() {
  return (
    <div className="bg-surface-muted">
      <div className="bg-white border-b border-line">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
          <SectionHeading
            kicker="Membership Application"
            title="Enroll for Membership"
            description="Choose the registration form that matches your level of study."
          />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 gap-6">
          <Link
            href="/membership/enroll/undergraduate"
            className="group bg-white rounded-lg border border-line p-8 hover:border-primary-800 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-800 flex items-center justify-center mb-5">
              <School size={22} />
            </div>
            <h2 className="font-display font-bold text-lg text-primary-950 mb-2">Undergraduate</h2>
            <p className="text-sm text-slate leading-relaxed mb-5">
              For undergraduate students (Level 100–400) registered with the Resource Center for Students with
              Special Needs.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 group-hover:text-accent-600">
              Start registration <ArrowRight size={14} />
            </span>
          </Link>

          <Link
            href="/membership/enroll/postgraduate"
            className="group bg-white rounded-lg border border-line p-8 hover:border-primary-800 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-800 flex items-center justify-center mb-5">
              <GraduationCap size={22} />
            </div>
            <h2 className="font-display font-bold text-lg text-primary-950 mb-2">Postgraduate</h2>
            <p className="text-sm text-slate leading-relaxed mb-5">
              For Masters and PhD students with special needs.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 group-hover:text-accent-600">
              View details <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
