import { requireMember } from "@/lib/auth/member";
import { PortalEventsPage } from "@/components/portal/PortalEventsPage";

export const metadata = { title: "Association Events" };
export const dynamic = "force-dynamic";

export default async function MemberEventsPage() {
  await requireMember();
  return (
    <PortalEventsPage
      title="Association Events"
      description="Meetings, programmes and gatherings across the association."
    />
  );
}
