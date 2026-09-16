import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TeamMemberForm } from "@/components/admin/forms/TeamMemberForm";
import { listActiveMembersForLinking } from "@/lib/services/membership-service";

export const metadata = { title: "Add a Leader" };
export const dynamic = "force-dynamic";

export default async function NewTeamMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  // Patron profiles now live in the Patrons section.
  if (type === "PATRON") redirect("/admin/patrons/profiles/new");

  // Linking emails the member about the appointment, shows their Executive
  // badge and charges them the Executive dues rate.
  const linkableMembers = await listActiveMembersForLinking();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/team" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-primary-800 mb-4">
        <ArrowLeft size={15} /> Back to Leadership
      </Link>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Add a Leader</h1>
      <div className="bg-white rounded-lg border border-line p-6">
        <TeamMemberForm type="LEADERSHIP" linkableMembers={linkableMembers} />
      </div>
    </div>
  );
}
