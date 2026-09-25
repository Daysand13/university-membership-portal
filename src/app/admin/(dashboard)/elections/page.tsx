import { requireCapability } from "@/lib/auth/admin";
import Link from "next/link";
import { Plus, Vote } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { listElectionsForAdmin } from "@/lib/services/election-service";
import { deleteElectionAction } from "@/lib/actions/election-actions";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Trash2, Pencil } from "lucide-react";

export const metadata = { title: "Elections" };
export const dynamic = "force-dynamic";

export default async function AdminElectionsPage() {
  await requireCapability("elections.manage");
  const elections = await listElectionsForAdmin();

  const columns: Column<(typeof elections)[number]>[] = [
    { header: "Title", cell: (election) => <span className="font-medium text-primary-950">{election.title}</span> },
    { header: "Candidates", cell: (election) => election.candidates.length },
    { header: "Status", cell: (election) => <StatusBadge status={election.status} /> },
    {
      header: "Actions",
      actions: true,
      cell: (election) => (
        <span className="inline-flex items-center justify-end gap-1">
          <Link
            href={`/admin/elections/${election.id}`}
            className="p-2 rounded-md text-slate hover:bg-surface-muted hover:text-primary-800"
          >
            <Pencil size={15} aria-hidden="true" />
            <span className="sr-only">Edit {election.title}</span>
          </Link>
          <ConfirmButton
            action={deleteElectionAction.bind(null, election.id)}
            confirmMessage="Delete this election permanently?"
            className="p-2 rounded-md text-slate hover:bg-danger-light hover:text-danger"
          >
            <Trash2 size={15} aria-hidden="true" />
            <span className="sr-only">Delete {election.title}</span>
          </ConfirmButton>
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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
        <DataTable caption="Elections" rows={elections} rowKey={(election) => election.id} columns={columns} />
      )}
    </div>
  );
}
