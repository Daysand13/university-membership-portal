import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AlumniAuthTabs } from "@/components/forms/AlumniAuthTabs";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = { title: "Alumni Sign In" };
export const dynamic = "force-dynamic";

export default async function AlumniLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordSet?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="bg-surface-muted min-h-[70vh]">
      <div className="bg-primary-950 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 text-center">
          <SectionHeading
            kicker="Alumni Network"
            title="Sign in to your alumni account"
            description="Reach the alumni directory, mentor current students, and keep your profile up to date."
            align="center"
            onDark
          />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
        {sp.passwordSet === "1" && (
          <div className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
            Your password has been set. Sign in below to continue.
          </div>
        )}
        <AlumniAuthTabs initialTab="signin" />
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
