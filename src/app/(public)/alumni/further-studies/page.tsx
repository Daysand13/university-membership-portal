import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { FurtherStudiesForm } from "@/components/forms/FurtherStudiesForm";

export const metadata = { title: "Continue Your Studies" };
export const dynamic = "force-dynamic";

export default async function FurtherStudiesPage() {
  const alumni = await requireAlumni();

  return (
    <div className="bg-surface-muted min-h-[70vh]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/alumni/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-primary-800 mb-4">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <h1 className="font-display font-bold text-2xl text-primary-950 mb-2">Continue Your Studies</h1>
        <p className="text-sm text-slate mb-6 leading-relaxed">
          Furthering your education at UEW? Submit your new academic details below to apply for current
          membership again. Once approved, you&apos;ll be able to log into the Member Portal with your new index
          number, alongside your existing Alumni account.
        </p>
        <div className="bg-white rounded-lg border border-line p-6 sm:p-7">
          <FurtherStudiesForm alumni={alumni} />
        </div>
      </div>
    </div>
  );
}
