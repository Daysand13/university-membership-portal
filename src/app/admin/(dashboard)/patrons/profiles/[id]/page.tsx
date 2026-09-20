import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { TeamMemberForm } from "@/components/admin/forms/TeamMemberForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getTeamMemberById } from "@/lib/services/content-service";
import { listActiveMembersForLinking } from "@/lib/services/membership-service";
import { deletePatronProfileListingAction } from "@/lib/actions/content-actions";

export const metadata = { title: "Edit Patron Profile" };
export const dynamic = "force-dynamic";

export default async function EditPatronProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("members.patrons");
  const { id } = await params;
  const profile = await getTeamMemberById(id);
  if (!profile) notFound();
  // A leadership listing is edited in its own section.
  if (profile.type !== "PATRON") redirect(`/admin/team/${id}`);

  const linkableMembers = await listActiveMembersForLinking({ includeFormer: true, includeMemberId: profile.memberId });

  return (
    <div className="max-w-2xl">
      <Link href="/admin/patrons/profiles" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-primary-800 mb-4">
        <ArrowLeft size={15} /> Back to Patron Profiles
      </Link>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Edit {profile.name}</h1>
        <ConfirmButton
          action={deletePatronProfileListingAction.bind(null, profile.id)}
          confirmMessage={`Remove ${profile.name}'s profile from the Patrons page? This deletes the profile, not any patron account.`}
          className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-light"
        >
          <Trash2 size={14} /> Remove
        </ConfirmButton>
      </div>
      <div className="bg-white rounded-lg border border-line p-6">
        <TeamMemberForm type="PATRON" member={profile} linkableMembers={linkableMembers} />
      </div>
    </div>
  );
}
