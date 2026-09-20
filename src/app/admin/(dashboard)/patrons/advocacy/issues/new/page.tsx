import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { IssueForm } from "@/components/admin/forms/AdvocacyForms";

export const metadata = { title: "Escalate an Issue" };
export const dynamic = "force-dynamic";

export default async function NewIssuePage() {
  await requireCapability("members.patrons");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="max-w-3xl">
      <Link href="/admin/patrons/advocacy" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Advocacy
      </Link>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Escalate an Issue to Patrons</h1>
      <div className="bg-white rounded-lg border border-line p-6">
        <IssueForm today={today} />
      </div>
    </div>
  );
}
