import Link from "next/link";
import { Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { listMembers } from "@/lib/services/membership-service";

export const metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const members = await listMembers({ search: q });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Members</h1>
        <p className="text-sm text-slate mt-1">{members.length} member{members.length === 1 ? "" : "s"}</p>
      </div>

      <form className="mb-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, index number, email…"
          className="w-full sm:w-80 rounded-md border border-line bg-white px-3.5 py-2 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
        />
      </form>

      {members.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="No members yet" description="Approved membership applications create member accounts automatically." />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Index Number</th>
                <th className="text-left px-5 py-3 font-semibold">Programme</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-primary-950">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-slate-light">{member.email}</p>
                  </td>
                  <td className="px-5 py-3.5 font-data text-xs text-ink">{member.indexNumber}</td>
                  <td className="px-5 py-3.5 text-slate">{member.programme}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={member.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/admin/members/${member.id}`} className="text-sm font-semibold text-primary-800 hover:text-accent-600">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
