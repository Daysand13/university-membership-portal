import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TeamMemberForm } from "@/components/admin/forms/TeamMemberForm";
import { listActiveMembersForLinking } from "@/lib/services/membership-service";
import type { TeamMemberType } from "@/generated/prisma/client";

export const metadata = { title: "Add Leadership / Patron" };
export const dynamic = "force-dynamic";

export default async function NewTeamMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: rawType } = await searchParams;
  const type: TeamMemberType = rawType === "PATRON" ? "PATRON" : "LEADERSHIP";
  // Only Leadership entries can be linked to a paying member account —
  // linking a Patron has no effect on dues, so the list isn't fetched for
  // that type at all.
  const linkableMembers = type === "LEADERSHIP" ? await listActiveMembersForLinking() : undefined;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/team" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-primary-800 mb-4">
        <ArrowLeft size={15} /> Back to Leadership & Patrons
      </Link>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">
        Add {type === "PATRON" ? "a Patron" : "a Leader"}
      </h1>
      <div className="bg-white rounded-lg border border-line p-6">
        <TeamMemberForm type={type} linkableMembers={linkableMembers} />
      </div>
    </div>
  );
}
