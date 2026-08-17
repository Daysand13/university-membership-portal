import { AboutContentForm } from "@/components/admin/forms/AboutContentForm";
import { getAboutContent } from "@/lib/services/content-service";

export const metadata = { title: "About Us" };
export const dynamic = "force-dynamic";

export default async function AdminAboutPage() {
  const about = await getAboutContent();
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">About Us</h1>
        <p className="text-sm text-slate mt-1">Controls the content shown on the public /about page.</p>
      </div>
      <div className="bg-white rounded-lg border border-line p-6">
        <AboutContentForm about={about} />
      </div>
    </div>
  );
}
