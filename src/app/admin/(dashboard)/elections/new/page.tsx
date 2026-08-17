import { ElectionForm } from "@/components/admin/forms/ElectionForm";

export const metadata = { title: "New Election" };

export default function NewElectionPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">New Election</h1>
      <div className="bg-white rounded-lg border border-line p-6">
        <ElectionForm />
      </div>
    </div>
  );
}
