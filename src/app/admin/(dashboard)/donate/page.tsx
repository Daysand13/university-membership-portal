import { DonateContentForm } from "@/components/admin/forms/DonateContentForm";
import { getDonateContent } from "@/lib/services/content-service";

export const metadata = { title: "Donate" };
export const dynamic = "force-dynamic";

export default async function AdminDonatePage() {
  const donate = await getDonateContent();
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Donate</h1>
        <p className="text-sm text-slate mt-1">Controls the content shown on the public /donate page.</p>
      </div>
      <div className="bg-white rounded-lg border border-line p-6">
        <DonateContentForm donate={donate} />
      </div>
    </div>
  );
}
