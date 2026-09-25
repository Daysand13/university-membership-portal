import { requireCapability } from "@/lib/auth/admin";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { TeamRowActions } from "@/components/admin/TeamRowActions";
import { listTeamMembersForAdmin } from "@/lib/services/content-service";
import { describeListingAccess, listAdminAccountsWithoutListing } from "@/lib/services/executive-access-service";
import { getAdminCapabilities } from "@/lib/auth/admin";
import { roleLabel } from "@/lib/auth/role-labels";
import { formatFullName } from "@/lib/format";
import { DataTable, type Column } from "@/components/admin/DataTable";

export const metadata = { title: "Leadership" };
export const dynamic = "force-dynamic";

const ACCESS_LABEL: Record<string, { label: string; classes: string }> = {
  active: { label: "Administrator", classes: "bg-success-light text-success" },
  pending: { label: "Invitation pending", classes: "bg-accent-100 text-primary-950" },
  deactivated: { label: "Deactivated", classes: "bg-danger-light text-danger" },
};

async function TeamSection({
  type,
  title,
  blurb,
  showAccess = false,
}: {
  type: "LEADERSHIP" | "PATRON";
  title: string;
  blurb: string;
  /** Only for leadership, and only for someone who may change privileges. */
  showAccess?: boolean;
}) {
  const members = await listTeamMembersForAdmin(type);
  const access = showAccess ? await describeListingAccess(members) : null;

  const columns: Column<(typeof members)[number]>[] = [
    {
      header: "Name",
      cell: (teamMember) => (
        <span className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-surface-muted border border-line overflow-hidden shrink-0 flex items-center justify-center text-slate-light">
            {teamMember.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={teamMember.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users size={14} aria-hidden="true" />
            )}
          </span>
          <span className="font-medium text-primary-950">{teamMember.name}</span>
        </span>
      ),
    },
    { header: "Position", cell: (teamMember) => teamMember.position },
    ...(type === "LEADERSHIP"
      ? [
          {
            header: "Linked Member",
            cell: (teamMember: (typeof members)[number]) =>
              teamMember.member
                ? `${formatFullName(teamMember.member.firstName, teamMember.member.middleName, teamMember.member.lastName)} — ${teamMember.member.indexNumber}`
                : "—",
          },
        ]
      : []),
    ...(showAccess
      ? [
          {
            header: "Portal Access",
            cell: (teamMember: (typeof members)[number]) => {
              const state = access?.get(teamMember.id) ?? null;
              if (!state) return <span className="text-xs text-slate">No account</span>;
              const tone = ACCESS_LABEL[state.status];
              return (
                <span className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone.classes}`}>
                    {tone.label}
                  </span>
                  <span className="text-xs text-slate">{roleLabel(state.role)}</span>
                </span>
              );
            },
          },
        ]
      : []),
    {
      header: "Status",
      cell: (teamMember) =>
        teamMember.isActive ? (
          <span className="text-xs font-semibold text-success">Active</span>
        ) : (
          <span className="text-xs font-semibold text-slate-light">Inactive</span>
        ),
    },
    {
      header: "Actions",
      actions: true,
      cell: (teamMember) => (
        <TeamRowActions id={teamMember.id} isActive={teamMember.isActive} name={teamMember.name} />
      ),
    },
  ];

  return (
    <div className="mb-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-primary-950">{title}</h2>
          <p className="text-sm text-slate mt-0.5">{blurb}</p>
        </div>
        <Link href={`/admin/team/new?type=${type}`}>
          <Button size="sm">
            <Plus size={15} /> Add
          </Button>
        </Link>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users size={26} />}
          title={`No ${title.toLowerCase()} added yet`}
          description="Add the first one to get started."
        />
      ) : (
        <DataTable caption={title} rows={members} rowKey={(teamMember) => teamMember.id} columns={columns} />
      )}
    </div>
  );
}

export default async function AdminTeamPage() {
  await requireCapability("content.team");
  // Privileges are granted on each executive's own page. These are the
  // administrator accounts that belong to nobody listed here — the site
  // owner, an editor who isn't on the committee — which would otherwise
  // have nowhere to be managed from.
  const capabilities = await getAdminCapabilities();
  const canManageAccess = capabilities.has("site.permissions");
  const unlisted = canManageAccess ? await listAdminAccountsWithoutListing() : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Leadership</h1>
        <p className="text-sm text-slate mt-1">
          These show up in the Executive Leadership section on the public About page. Patrons are managed in{" "}
          <Link href="/admin/patrons/profiles" className="font-semibold text-primary-800 hover:text-accent-600">
            Patrons › Public Profiles
          </Link>
          .
        </p>
      </div>

      <TeamSection
        type="LEADERSHIP"
        title="Executive Leadership and Team"
        blurb="The current executive committee / leadership team. Open anyone to edit their profile and what they can do in the portal."
        showAccess={canManageAccess}
      />

      {canManageAccess && (
        <section aria-labelledby="other-accounts-heading" className="mt-10">
          <h2 id="other-accounts-heading" className="font-display font-bold text-lg text-primary-950">
            Other administrator accounts
          </h2>
          <p className="text-sm text-slate mt-0.5 mb-4">
            Accounts that aren&apos;t behind a leadership listing. An executive&apos;s privileges belong on their own
            profile above.
          </p>
          {unlisted.length === 0 ? (
            <p className="bg-white rounded-lg border border-line p-5 text-sm text-slate">
              Every administrator account belongs to someone listed above.
            </p>
          ) : (
            <ul className="bg-white rounded-lg border border-line divide-y divide-line">
              {unlisted.map((admin) => (
                <li key={admin.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-primary-950 truncate">{admin.name}</span>
                    <span className="block text-xs text-slate truncate">
                      {admin.email} · {roleLabel(admin.role)}
                      {!admin.isActive && <span className="text-danger"> · Deactivated</span>}
                      {admin.isActive && !admin.lastLoginAt && (
                        <span className="text-accent-700"> · Invitation pending</span>
                      )}
                    </span>
                  </span>
                  <Link
                    href={`/admin/permissions?account=${admin.id}`}
                    className="text-sm font-semibold text-primary-800 hover:text-accent-600"
                  >
                    Manage
                    <span className="sr-only"> {admin.name}&apos;s privileges</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm">
            <Link href="/admin/permissions" className="font-semibold text-primary-800 hover:text-accent-600">
              Add an administrator who isn&apos;t on the committee
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
