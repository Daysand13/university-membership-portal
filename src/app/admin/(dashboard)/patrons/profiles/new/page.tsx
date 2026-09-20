import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TeamMemberForm } from "@/components/admin/forms/TeamMemberForm";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { listActiveMembersForLinking } from "@/lib/services/membership-service";
import { getPatronById } from "@/lib/services/patron-service";

export const metadata = { title: "Add Patron Profile" };
export const dynamic = "force-dynamic";

export default async function NewPatronProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  await requireCapability("members.patrons");
  const { from } = await searchParams;

  // Opened from an approved patron's page: start from what they told us.
  const [patron, linkableMembers] = await Promise.all([
    from ? getPatronById(from) : null,
    // Patrons are often graduates, so former members can be linked too.
    listActiveMembersForLinking({ includeFormer: true }),
  ]);
  const defaults = patron
    ? {
        name: [patron.title, patron.fullName].filter(Boolean).join(" "),
        position: [patron.jobTitle, patron.organization].filter(Boolean).join(", ") || patron.occupation,
      }
    : undefined;

  return (
    <div className="max-w-2xl">
      <Link
        href={patron ? `/admin/patrons/${patron.id}` : "/admin/patrons/profiles"}
        className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-primary-800 mb-4"
      >
        <ArrowLeft size={15} /> {patron ? `Back to ${defaults?.name}` : "Back to Patron Profiles"}
      </Link>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-2">Add a Patron Profile</h1>
      <p className="text-sm text-slate mb-6">
        {patron
          ? "Filled in from their application — add a photo and a short bio, then save to show them on the public Patrons page."
          : "This profile is shown on the public Patrons page once saved as active."}
      </p>
      <div className="bg-white rounded-lg border border-line p-6">
        <TeamMemberForm type="PATRON" linkableMembers={linkableMembers} defaults={defaults} />
      </div>
    </div>
  );
}
