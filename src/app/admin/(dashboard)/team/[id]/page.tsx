import { adminCan, requireAdminUser, requireCapability } from "@/lib/auth/admin";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { TeamMemberForm } from "@/components/admin/forms/TeamMemberForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { getTeamMemberById } from "@/lib/services/content-service";
import { listActiveMembersForLinking } from "@/lib/services/membership-service";
import { deleteTeamMemberAction } from "@/lib/actions/content-actions";
import { getExecutiveAccess } from "@/lib/services/executive-access-service";
import { PermissionManager } from "@/components/admin/forms/PermissionManager";
import { AdminAccountActions } from "@/components/admin/forms/AdminAccountForms";
import {
  ExecutiveAccountStatus,
  GiveExecutiveAccessForm,
  NoMemberAccountNotice,
} from "@/components/admin/forms/ExecutiveAccessPanel";

export const metadata = { title: "Edit Leadership / Patron" };
export const dynamic = "force-dynamic";

export default async function EditTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("content.team");
  const actor = await requireAdminUser();
  const { id } = await params;
  const teamMember = await getTeamMemberById(id);
  if (!teamMember) notFound();
  // Patron profiles are edited in the Patrons section.
  if (teamMember.type === "PATRON") redirect(`/admin/patrons/profiles/${id}`);

  const linkableMembers = await listActiveMembersForLinking({ includeMemberId: teamMember.memberId });
  // What this executive may do in the portal is edited here too, rather
  // than on a screen of its own — it is part of who they are in the
  // association, and this is where the rest of that is written down.
  const canManageAccess = adminCan(actor, "site.permissions");
  const access = canManageAccess ? await getExecutiveAccess(teamMember.id) : null;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/team" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-primary-800 mb-4">
        <ArrowLeft size={15} /> Back to Leadership
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
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

      {access && (
        <section aria-labelledby="access-heading" className="mt-8">
          <h2 id="access-heading" className="font-display font-bold text-lg text-primary-950">
            Portal access and privileges
          </h2>
          <p className="text-sm text-slate mt-1 mb-4">
            What {teamMember.name} can open and do in the admin area. Their base role sets the defaults; change any of
            them for this person alone.
          </p>

          {access.admin ? (
            <>
              <div className="bg-white rounded-lg border border-line p-6 mb-5 flex flex-wrap items-start justify-between gap-3">
                <ExecutiveAccountStatus
                  email={access.admin.email}
                  isActive={access.admin.isActive}
                  hasSignedIn={Boolean(access.admin.lastLoginAt)}
                  role={access.admin.role}
                />
                {access.admin.id !== actor.id && (
                  <AdminAccountActions
                    adminId={access.admin.id}
                    name={access.admin.name}
                    email={access.admin.email}
                    isActive={access.admin.isActive}
                    hasSignedIn={Boolean(access.admin.lastLoginAt)}
                  />
                )}
              </div>
              {access.admin.id === actor.id ? (
                <p className="bg-white rounded-lg border border-line p-6 text-sm text-slate">
                  This is your own account. Nobody can change their own privileges — one wrong toggle would lock you
                  out of the screen that puts it right. Ask another super administrator.
                </p>
              ) : (
                <PermissionManager
                  key={access.admin.id}
                  target={{
                    id: access.admin.id,
                    name: access.admin.name,
                    email: access.admin.email,
                    role: access.admin.role,
                    capabilities: access.admin.capabilities,
                  }}
                />
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg border border-line p-6 space-y-4">
              {!access.member && <NoMemberAccountNotice name={teamMember.name} />}
              <GiveExecutiveAccessForm
                teamMemberId={teamMember.id}
                name={teamMember.name}
                memberEmail={access.member?.email ?? null}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
