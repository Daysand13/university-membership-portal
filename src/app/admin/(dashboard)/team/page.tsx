import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { TeamRowActions } from "@/components/admin/TeamRowActions";
import { listTeamMembersForAdmin } from "@/lib/services/content-service";
import { formatFullName } from "@/lib/format";

export const metadata = { title: "Leadership & Patrons" };
export const dynamic = "force-dynamic";

async function TeamSection({ type, title, blurb }: { type: "LEADERSHIP" | "PATRON"; title: string; blurb: string }) {
  const members = await listTeamMembersForAdmin(type);

  return (
    <div className="mb-10">
      <div className="flex items-start justify-between gap-4 mb-4">
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
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Position</th>
                {type === "LEADERSHIP" && (
                  <th className="text-left px-5 py-3 font-semibold">Linked Member</th>
                )}
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((teamMember) => (
                <tr key={teamMember.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-surface-muted border border-line overflow-hidden shrink-0 flex items-center justify-center text-slate-light">
                        {teamMember.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={teamMember.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users size={14} />
                        )}
                      </div>
                      <span className="font-medium text-primary-950">{teamMember.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{teamMember.position}</td>
                  {type === "LEADERSHIP" && (
                    <td className="px-5 py-3.5 text-slate">
                      {teamMember.member
                        ? `${formatFullName(teamMember.member.firstName, teamMember.member.middleName, teamMember.member.lastName)} — ${teamMember.member.indexNumber}`
                        : "—"}
                    </td>
                  )}
                  <td className="px-5 py-3.5">
                    {teamMember.isActive ? (
                      <span className="text-xs font-semibold text-success">Active</span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-light">Inactive</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <TeamRowActions id={teamMember.id} isActive={teamMember.isActive} name={teamMember.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function AdminTeamPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Leadership & Patrons</h1>
        <p className="text-sm text-slate mt-1">
          These show up in the Executive Leadership and Our Patrons sections on the public About page.
        </p>
      </div>

      <TeamSection
        type="LEADERSHIP"
        title="Executive Leadership and Team"
        blurb="The current executive committee / leadership team."
      />
      <TeamSection
        type="PATRON"
        title="Our Patrons"
        blurb="Patrons of the association, shown with name, photo, position, and a short bio."
      />
    </div>
  );
}
