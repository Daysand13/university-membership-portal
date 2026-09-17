import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { CampaignForm } from "@/components/admin/forms/AdvocacyForms";

export const metadata = { title: "New Campaign" };
export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  return (
    <div className="max-w-3xl">
      <Link href="/admin/patrons/advocacy" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Advocacy
      </Link>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">New Campaign</h1>
      <div className="bg-white rounded-lg border border-line p-6">
        <CampaignForm />
      </div>
    </div>
  );
}
