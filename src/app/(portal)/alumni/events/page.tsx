import { requireAlumni } from "@/lib/auth/alumni";
import { PortalEventsPage } from "@/components/portal/PortalEventsPage";

export const metadata = { title: "Events & Reunions" };
export const dynamic = "force-dynamic";

export default async function AlumniEventsPage() {
  await requireAlumni();
  return (
    <PortalEventsPage
      title="Events & Reunions"
      description="Reunions, alumni gatherings and events across the association."
    />
  );
}
