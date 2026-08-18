import Link from "next/link";
import { Plus, Vote } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { listElectionsForAdmin } from "@/lib/services/election-service";
import { deleteElectionAction } from "@/lib/actions/election-actions";
import { Trash2, Pencil } from "lucide-react";

export const metadata = { title: "Elections" };
export const dynamic = "force-dynamic";

export default async function AdminElectionsPage() {
  const elections = await listElectionsForAdmin();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Elections</h1>
          <p className="text-sm text-slate mt-1">Only one PUBLISHED election shows on the public page at a time.</p>
        </div>
        <Link href="/admin/elections/new">
          <Button>
            <Plus size={16} /> New Election
          </Button>
        </Link>
      </div>

      {elections.length === 0 ? (
        <EmptyState icon={<Vote size={28} />} title="No elections yet" description="Create election information to publish on the public Elections page." />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Title</th>
                <th className="text-left px-5 py-3 font-semibold">Candidates</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {elections.map((election) => (
                <tr key={election.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5 font-medium text-primary-950">{election.title}</td>
                  <td className="px-5 py-3.5 text-slate">{election.candidates.length}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={election.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/elections/${election.id}`} className="p-2 rounded-md text-slate hover:bg-surface-muted hover:text-primary-800">
                        <Pencil size={15} />
                      </Link>
                      <ConfirmButton
                        action={deleteElectionAction.bind(null, election.id)}
                        confirmMessage="Delete this election permanently?"
                        className="p-2 rounded-md text-slate hover:bg-danger-light hover:text-danger"
                      >
                        <Trash2 size={15} />
                      </ConfirmButton>
                    </div>
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
