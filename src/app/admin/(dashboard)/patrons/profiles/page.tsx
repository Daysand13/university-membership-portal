import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { TeamRowActions } from "@/components/admin/TeamRowActions";
import { PatronsSectionNav } from "@/components/admin/PatronsSectionNav";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { listTeamMembersForAdmin } from "@/lib/services/content-service";
import { formatFullName } from "@/lib/format";
import { DataTable, type Column } from "@/components/admin/DataTable";

export const metadata = { title: "Patron Profiles" };
export const dynamic = "force-dynamic";

export default async function PatronProfilesPage() {
  const admin = await requireCapability("members.patrons");
  const profiles = await listTeamMembersForAdmin("PATRON");

  const columns: Column<(typeof profiles)[number]>[] = [
    {
      header: "Name",
      cell: (profile) => (
        <span className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-surface-muted border border-line overflow-hidden shrink-0 flex items-center justify-center text-slate-light">
            {profile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users size={14} aria-hidden="true" />
            )}
          </span>
          <span className="font-medium text-primary-950">{profile.name}</span>
        </span>
      ),
    },
    { header: "Position", cell: (profile) => profile.position },
    {
      header: "Linked Member",
      cell: (profile) =>
        profile.member
          ? `${formatFullName(profile.member.firstName, profile.member.middleName, profile.member.lastName)} — ${profile.member.indexNumber}`
          : "—",
    },
    {
      header: "On the Patrons page",
      cell: (profile) =>
        profile.isActive ? (
          <span className="text-xs font-semibold text-success">Shown</span>
        ) : (
          <span className="text-xs font-semibold text-slate-light">Hidden</span>
        ),
    },
    {
      header: "Actions",
      actions: true,
      cell: (profile) => (
        <TeamRowActions
          id={profile.id}
          isActive={profile.isActive}
          name={profile.name}
          editHref={`/admin/patrons/profiles/${profile.id}`}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display font-bold text-2xl text-primary-950">Patrons</h1>
      </div>
      <PatronsSectionNav current="profiles" showAccounts={admin.role !== AdminRole.EDITOR} />

      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <p className="text-sm text-slate max-w-2xl">
          The patrons shown on the public Patrons page, with their photo, position and a short bio. Hide a profile to
          take it off the page without deleting it. Linking a profile to a member account emails that member and shows
          a Patron badge in their portal.
        </p>
        <Link href="/admin/patrons/profiles/new">
          <Button size="sm">
            <Plus size={15} /> Add Profile
          </Button>
        </Link>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={<Users size={26} />}
          title="No patron profiles yet"
          description="Add one to show it on the public Patrons page — or open an approved patron and add theirs from there."
        />
      ) : (
        <DataTable caption="Patron profiles" rows={profiles} rowKey={(profile) => profile.id} columns={columns} />
      )}
    </div>
  );
}
