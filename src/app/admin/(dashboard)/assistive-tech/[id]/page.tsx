import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getSoftware } from "@/lib/services/assistive-software-service";
import { deleteSoftwareAction } from "@/lib/actions/outreach-admin-actions";
import { SoftwareForm } from "@/components/admin/forms/OutreachForms";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const metadata = { title: "Edit Software" };
export const dynamic = "force-dynamic";

export default async function EditSoftwarePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdminRole(AdminRole.EDITOR, AdminRole.MEMBERSHIP_OFFICER);
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const software = await getSoftware(id);
  if (!software) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/assistive-tech" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Assistive Software
      </Link>
      {created === "1" && (
        <div role="status" className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
          Added to the directory.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">{software.name}</h1>
        <ConfirmButton
          action={deleteSoftwareAction.bind(null, software.id)}
          confirmMessage={`Remove ${software.name} from the directory? This can't be undone.`}
          className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-light"
        >
          <Trash2 size={14} aria-hidden="true" /> Delete
        </ConfirmButton>
      </div>
      <div className="bg-white rounded-lg border border-line p-6">
        <SoftwareForm
          software={{
            id: software.id,
            name: software.name,
            logoUrl: software.logoUrl,
            category: software.category,
            platforms: software.platforms,
            description: software.description,
            isFree: software.isFree,
            telegramUrl: software.telegramUrl,
            websiteUrl: software.websiteUrl,
            order: software.order,
            isActive: software.isActive,
          }}
        />
      </div>
    </div>
  );
}
