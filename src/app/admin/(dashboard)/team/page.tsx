import { Users, Trash2 } from "lucide-react";
import { TeamMemberForm } from "@/components/admin/forms/TeamMemberForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { EmptyState } from "@/components/ui/Common";
import { listTeamMembersForAdmin } from "@/lib/services/content-service";
import { deleteTeamMemberAction } from "@/lib/actions/content-actions";

export const metadata = { title: "Leadership & Patrons" };
export const dynamic = "force-dynamic";

async function TeamSection({ type, title, blurb }: { type: "LEADERSHIP" | "PATRON"; title: string; blurb: string }) {
  const members = await listTeamMembersForAdmin(type);

  return (
    <div className="mb-10">
      <div className="mb-4">
        <h2 className="font-display font-bold text-lg text-primary-950">{title}</h2>
        <p className="text-sm text-slate mt-0.5">{blurb}</p>
      </div>

      {members.length === 0 ? (
        <EmptyState icon={<Users size={26} />} title={`No ${title.toLowerCase()} added yet`} description="Add the first one below." />
      ) : (
        <div className="space-y-4 mb-6">
          {members.map((member) => (
            <div key={member.id} className="bg-white rounded-lg border border-line p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-primary-950">{member.name}</span>
                  <span className="text-xs text-slate-light">{member.position}</span>
                  {!member.isActive && (
                    <span className="text-xs text-slate-light bg-surface-muted rounded-full px-2 py-0.5">Inactive</span>
                  )}
                </div>
                <ConfirmButton
                  action={deleteTeamMemberAction.bind(null, member.id)}
                  confirmMessage={`Remove ${member.name}?`}
                  className="p-2 rounded-md text-slate hover:bg-danger-light hover:text-danger"
                >
                  <Trash2 size={15} />
                </ConfirmButton>
              </div>
              <TeamMemberForm type={type} member={member} />
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface-muted rounded-lg border border-dashed border-line p-5">
        <h3 className="text-sm font-semibold text-primary-950 mb-4">Add {title === "Our Patrons" ? "a Patron" : "a Leader"}</h3>
        <TeamMemberForm type={type} />
      </div>
    </div>
  );
}

export default async function AdminTeamPage() {
  return (
    <div className="max-w-3xl">
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
