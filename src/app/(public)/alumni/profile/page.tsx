import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { AlumniProfileForm } from "@/components/forms/AlumniProfileForm";
import { AlumniChangePasswordForm } from "@/components/forms/AlumniChangePasswordForm";

export const metadata = { title: "Edit Alumni Profile" };
export const dynamic = "force-dynamic";

export default async function AlumniProfilePage() {
  const alumni = await requireAlumni();

  return (
    <div className="bg-surface-muted min-h-[70vh]">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div>
          <Link href="/alumni/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-primary-800 mb-4">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Edit Profile</h1>
          <div className="bg-white rounded-lg border border-line p-6 sm:p-7">
            <AlumniProfileForm alumni={alumni} />
          </div>
        </div>

        <div id="password">
          <h2 className="font-display font-bold text-lg text-primary-950 mb-1">Change Password</h2>
          <p className="text-sm text-slate mb-4">Choose a strong, unique password you don&apos;t use anywhere else.</p>
          <div className="bg-white rounded-lg border border-line p-6 sm:p-7">
            <AlumniChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
