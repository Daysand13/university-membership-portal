import Link from "next/link";
import { ArrowLeft, MapPin, Plus, Users } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { listStudyGroups } from "@/lib/services/study-group-service";
import {
  closeStudyGroupAction,
  joinStudyGroupAction,
  leaveStudyGroupAction,
} from "@/lib/actions/student-portal-actions";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { EmptyState } from "@/components/ui/Common";
import { PortalActionButton, StudyGroupForm } from "@/components/student-portal/Forms";

export const metadata = { title: "Study Groups" };
export const dynamic = "force-dynamic";

/**
 * Study groups students run themselves. No approval and no executive in the
 * middle — whoever starts a group runs it, and anyone can join.
 */
export default async function StudyGroupsPage() {
  const member = await requireMember();
  const groups = await listStudyGroups(member.id);

  return (
    <>
      <Link
        href="/membership/dashboard/academic"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
      >
        <ArrowLeft size={15} aria-hidden="true" /> Academic & Study Groups
      </Link>
      <PortalPageHeader
        title="Study Groups"
        description="Groups other members are running, and one you can start yourself. Joining puts your name and level on the group's list so the others know who's coming."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <DashboardCard id="groups" title="Open Groups" icon={<Users size={20} />} readAloud>
          {groups.length === 0 ? (
            <EmptyState
              icon={<Users size={28} aria-hidden="true" />}
              title="No groups yet"
              description="Start the first one — say what you're studying and when you'd meet."
            />
          ) : (
            <ul className="divide-y divide-line">
              {groups.map((group) => (
                <li key={group.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <p className="font-semibold text-primary-950 break-words min-w-0">{group.name}</p>
                    <span className="text-xs font-semibold text-slate shrink-0">
                      {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-sm text-slate mt-0.5">
                    {group.focus}
                    {group.startedBy && <> · started by {group.startedBy}</>}
                  </p>
                  {group.description && <p className="text-[15px] text-ink mt-1.5">{group.description}</p>}
                  {group.meetingInfo && (
                    <p className="text-sm text-slate mt-1.5 flex items-center gap-1.5">
                      <MapPin size={13} aria-hidden="true" className="shrink-0" /> {group.meetingInfo}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.hasJoined ? (
                      <PortalActionButton
                        action={leaveStudyGroupAction.bind(null, group.id)}
                        pendingLabel="Leaving…"
                      >
                        Leave group
                      </PortalActionButton>
                    ) : (
                      <PortalActionButton
                        action={joinStudyGroupAction.bind(null, group.id)}
                        variant="primary"
                        pendingLabel="Joining…"
                      >
                        <Plus size={15} aria-hidden="true" /> Join
                      </PortalActionButton>
                    )}
                    {group.isMine && (
                      <PortalActionButton
                        action={closeStudyGroupAction.bind(null, group.id)}
                        variant="danger"
                        confirm="Close this group? It stops showing for everyone."
                        pendingLabel="Closing…"
                      >
                        Close group
                      </PortalActionButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard id="new-group" title="Start a Group" icon={<Plus size={20} />}>
          <StudyGroupForm />
        </DashboardCard>
      </div>
    </>
  );
}
