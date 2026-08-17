import { notFound } from "next/navigation";
import { ElectionForm } from "@/components/admin/forms/ElectionForm";
import { getElectionForAdmin } from "@/lib/services/election-service";

export const metadata = { title: "Edit Election" };
export const dynamic = "force-dynamic";

export default async function EditElectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const election = await getElectionForAdmin(id);
  if (!election) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Edit Election</h1>
      <div className="bg-white rounded-lg border border-line p-6">
        <ElectionForm election={election} />
      </div>
      <p className="text-xs text-slate mt-4">
        Candidate management isn&apos;t wired up in this pass — the data model (ElectionCandidate) is ready for
        it. See the README for how to extend this screen.
      </p>
    </div>
  );
}
