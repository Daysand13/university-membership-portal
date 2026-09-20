import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getAllyForAdmin } from "@/lib/services/ally-service";
import { deleteAllyAction } from "@/lib/actions/outreach-admin-actions";
import { AllyForm } from "@/components/admin/forms/OutreachForms";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const metadata = { title: "Edit Ally" };
export const dynamic = "force-dynamic";

export default async function EditAllyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireCapability("outreach.allies");
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const ally = await getAllyForAdmin(id);
  if (!ally) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/allies" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Allies &amp; Champions
      </Link>
      {created === "1" && (
        <div role="status" className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
          Ally added{ally.isActive ? " — they're on the public page now." : ". They're hidden until you tick “Show on the public page”."}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">{ally.name}</h1>
        <ConfirmButton
          action={deleteAllyAction.bind(null, ally.id)}
          confirmMessage={`Remove ${ally.name} from the Allies page? This can't be undone.`}
          className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-light"
        >
          <Trash2 size={14} aria-hidden="true" /> Delete
        </ConfirmButton>
      </div>
      {ally.signup && (
        <p className="text-sm text-slate mb-4">
          From {ally.signup.fullName}&apos;s sign-up ({ally.signup.email})
          {ally.signup.unsubscribedAt ? " — they've since unsubscribed from emails." : "."}
        </p>
      )}
      <div className="bg-white rounded-lg border border-line p-6">
        <AllyForm
          ally={{
            id: ally.id,
            type: ally.type,
            name: ally.name,
            imageUrl: ally.imageUrl,
            role: ally.role,
            organization: ally.organization,
            sector: ally.sector,
            statement: ally.statement,
            spotlightQuote: ally.spotlightQuote,
            featured: ally.featured,
            websiteUrl: ally.websiteUrl,
            order: ally.order,
            isActive: ally.isActive,
          }}
        />
      </div>
    </div>
  );
}
