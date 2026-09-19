import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getAllySignup } from "@/lib/services/ally-service";
import { AllyForm } from "@/components/admin/forms/OutreachForms";

export const metadata = { title: "Add Ally" };
export const dynamic = "force-dynamic";

/**
 * A new listing — blank, or started from a sign-up that asked to be listed
 * (?fromSignup=…), with their name and organisation already filled in.
 */
export default async function NewAllyPage({ searchParams }: { searchParams: Promise<{ fromSignup?: string }> }) {
  await requireAdminRole(AdminRole.EDITOR, AdminRole.MEMBERSHIP_OFFICER);
  const { fromSignup } = await searchParams;
  const signup = fromSignup ? await getAllySignup(fromSignup) : null;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/allies" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Allies &amp; Champions
      </Link>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-2">Add Ally</h1>
      {signup && (
        <p className="text-sm text-slate mb-6">
          Started from {signup.fullName}&apos;s sign-up ({signup.email}). Check with them before adding a photo or a
          statement in their name.
        </p>
      )}
      <div className="bg-white rounded-lg border border-line p-6 mt-4">
        <AllyForm
          ally={{
            type: signup?.type ?? "INDIVIDUAL",
            name: signup?.fullName ?? "",
            imageUrl: null,
            role: null,
            organization: signup?.organization ?? null,
            sector: null,
            statement: null,
            spotlightQuote: null,
            featured: false,
            websiteUrl: null,
            order: 0,
            isActive: true,
            signupId: signup?.id ?? null,
          }}
        />
      </div>
    </div>
  );
}
