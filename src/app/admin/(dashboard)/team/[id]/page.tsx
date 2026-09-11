import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { TeamMemberForm } from "@/components/admin/forms/TeamMemberForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { getTeamMemberById } from "@/lib/services/content-service";
import { listActiveMembersForLinking } from "@/lib/services/membership-service";
import { deleteTeamMemberAction } from "@/lib/actions/content-actions";

export const metadata = { title: "Edit Leadership / Patron" };
export const dynamic = "force-dynamic";

export default async function EditTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamMember = await getTeamMemberById(id);
  if (!teamMember) notFound();

  const linkableMembers =
    teamMember.type === "LEADERSHIP" ? await listActiveMembersForLinking() : undefined;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/team" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-primary-800 mb-4">
        <ArrowLeft size={15} /> Back to Leadership & Patrons
      </Link>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Edit {teamMember.name}</h1>
        <ConfirmButton
          action={deleteTeamMemberAction.bind(null, teamMember.id)}
          confirmMessage={`Remove ${teamMember.name}?`}
          className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-light"
        >
          <Trash2 size={14} /> Remove
        </ConfirmButton>
      </div>
      <div className="bg-white rounded-lg border border-line p-6">
        <TeamMemberForm type={teamMember.type} member={teamMember} linkableMembers={linkableMembers} />
      </div>
    </div>
  );
}
