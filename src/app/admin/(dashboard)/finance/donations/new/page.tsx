import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { RecordDonationForm } from "@/components/admin/forms/FinanceForms";

export const metadata = { title: "Record a Donation" };
export const dynamic = "force-dynamic";

export default async function NewDonationPage() {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  return (
    <div className="max-w-3xl">
      <Link href="/admin/finance/donations" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Donations
      </Link>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Record a Donation</h1>
      <div className="bg-white rounded-lg border border-line p-6">
        <RecordDonationForm today={new Date().toISOString().slice(0, 10)} />
      </div>
    </div>
  );
}
