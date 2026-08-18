import { Share2, Trash2 } from "lucide-react";
import { SocialIcon } from "@/components/layout/SocialIcon";
import { SocialLinkForm } from "@/components/admin/forms/SocialLinkForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { EmptyState } from "@/components/ui/Common";
import { listSocialLinksForAdmin } from "@/lib/services/content-service";
import { deleteSocialLinkAction } from "@/lib/actions/content-actions";

export const metadata = { title: "Social Links" };
export const dynamic = "force-dynamic";

export default async function AdminSocialLinksPage() {
  const links = await listSocialLinksForAdmin();

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Social Links</h1>
        <p className="text-sm text-slate mt-1">
          These control the icons shown in the site header, footer, and mobile menu. Public links are never
          hard-coded into the frontend.
        </p>
      </div>

      {links.length === 0 ? (
        <EmptyState icon={<Share2 size={28} />} title="No social links yet" description="Add your first platform below." />
      ) : (
        <div className="space-y-4 mb-8">
          {links.map((link) => (
            <div key={link.id} className="bg-white rounded-lg border border-line p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5 text-primary-800">
                  <SocialIcon platform={link.platform} />
                  <span className="text-sm font-semibold text-primary-950">{link.displayName}</span>
                </div>
                <ConfirmButton
                  action={deleteSocialLinkAction.bind(null, link.id)}
                  confirmMessage={`Remove the ${link.displayName} link?`}
                  className="p-2 rounded-md text-slate hover:bg-danger-light hover:text-danger"
                >
                  <Trash2 size={15} />
                </ConfirmButton>
              </div>
              <SocialLinkForm link={link} />
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface-muted rounded-lg border border-dashed border-line p-5">
        <h2 className="text-sm font-semibold text-primary-950 mb-4">Add a New Platform</h2>
        <SocialLinkForm />
      </div>
    </div>
  );
}
