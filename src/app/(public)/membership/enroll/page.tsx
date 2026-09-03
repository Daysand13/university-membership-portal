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
            className="group relative overflow-hidden rounded-lg border-2 border-accent-400 bg-gradient-to-br from-accent-50 via-white to-white p-8 shadow-sm hover:border-accent-500 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-accent-200/50" />
            <div className="relative w-12 h-12 rounded-full bg-accent-500 text-white flex items-center justify-center mb-5 shadow-sm">
              <School size={22} />
            </div>
            <h2 className="relative font-display font-bold text-lg text-primary-950 mb-2">Undergraduate</h2>
            <p className="relative text-sm text-slate leading-relaxed mb-5">
              For undergraduate students (Level 100–400) registered with the Resource Center for Students with
              Special Needs.
            </p>
            <span className="relative inline-flex items-center gap-1.5 text-sm font-bold text-accent-700 group-hover:text-accent-600">
              Start registration <ArrowRight size={14} />
            </span>
          </Link>

          <Link
            href="/membership/enroll/postgraduate"
            className="group relative overflow-hidden rounded-lg border-2 border-accent-400 bg-gradient-to-br from-accent-50 via-white to-white p-8 shadow-sm hover:border-accent-500 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-accent-200/50" />
            <div className="relative w-12 h-12 rounded-full bg-accent-500 text-white flex items-center justify-center mb-5 shadow-sm">
              <GraduationCap size={22} />
            </div>
            <h2 className="relative font-display font-bold text-lg text-primary-950 mb-2">Postgraduate</h2>
            <p className="relative text-sm text-slate leading-relaxed mb-5">
              For Masters and PhD students with special needs.
            </p>
            <span className="relative inline-flex items-center gap-1.5 text-sm font-bold text-accent-700 group-hover:text-accent-600">
              Start registration <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
