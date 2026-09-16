import { requirePatron } from "@/lib/auth/patron";
import { PortalEventsPage } from "@/components/portal/PortalEventsPage";

export const metadata = { title: "Association Events" };
export const dynamic = "force-dynamic";

export default async function PatronEventsPage() {
  await requirePatron();
  return (
    <PortalEventsPage
      title="Association Events"
      description="Programmes, gatherings and events across the association."
    />
  );
}
