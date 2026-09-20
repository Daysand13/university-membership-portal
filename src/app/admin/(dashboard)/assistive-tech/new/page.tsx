import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { SoftwareForm } from "@/components/admin/forms/OutreachForms";

export const metadata = { title: "Add Software" };
export const dynamic = "force-dynamic";

export default async function NewSoftwarePage() {
  await requireCapability("outreach.software");

  return (
    <div className="max-w-3xl">
      <Link href="/admin/assistive-tech" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Assistive Software
      </Link>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Add Software</h1>
      <div className="bg-white rounded-lg border border-line p-6">
        <SoftwareForm
          software={{
            name: "",
            logoUrl: null,
            category: "VISION",
            platforms: [],
            description: "",
            isFree: true,
            telegramUrl: null,
            websiteUrl: null,
            order: 0,
            isActive: true,
          }}
        />
      </div>
    </div>
  );
}
