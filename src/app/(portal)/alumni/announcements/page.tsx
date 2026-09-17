import { requireAlumni } from "@/lib/auth/alumni";
import { listAnnouncementsForAlumni } from "@/lib/services/broadcast-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { AnnouncementsList } from "@/components/patron-portal/Display";

export const metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

export default async function AlumniAnnouncementsPage() {
  await requireAlumni();
  const announcements = await listAnnouncementsForAlumni(50);

  return (
    <div>
      <PortalPageHeader
        title="Announcements"
        description="Messages from the association's patrons, shared with alumni after the association's review."
      />
      <AnnouncementsList announcements={announcements} emptyText="There are no announcements for you yet." />
    </div>
  );
}
