import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AlumniAuthTabs } from "@/components/forms/AlumniAuthTabs";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = { title: "Join the Alumni Community" };
export const dynamic = "force-dynamic";

export default function AlumniRegisterPage() {
  return (
    <div className="bg-surface-muted min-h-[70vh]">
      <div className="bg-primary-950 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 text-center">
          <SectionHeading
            kicker="Alumni Network"
            title="Join the alumni community"
            description="Register to join fellow graduates of the association — reach the alumni directory, offer mentorship to current students, and stay part of the community after graduation."
            align="center"
            onDark
          />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
        <AlumniAuthTabs initialTab="register" />
        <Link
          href="/alumni"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
        >
          <ArrowLeft size={15} /> Back to the alumni page
        </Link>
      </div>
    </div>
  );
}
