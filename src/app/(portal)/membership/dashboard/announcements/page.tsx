import { requireMember } from "@/lib/auth/member";
import { listAnnouncementsForMember } from "@/lib/services/broadcast-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { AnnouncementsList } from "@/components/patron-portal/Display";

export const metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

export default async function MemberAnnouncementsPage() {
  const member = await requireMember();
  const announcements = await listAnnouncementsForMember(member.id, 50);

  return (
    <div>
      <PortalPageHeader
        title="Announcements"
        description="Messages from the association's patrons, shared with students after the association's review."
      />
      <AnnouncementsList announcements={announcements} emptyText="There are no announcements for you yet." />
    </div>
  );
}
