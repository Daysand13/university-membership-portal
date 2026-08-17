import { Image as ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/Common";
import { MediaLibraryUploader } from "@/components/admin/MediaLibraryUploader";
import { MediaGrid } from "@/components/admin/MediaGrid";
import { listMedia } from "@/lib/services/media-service";

export const metadata = { title: "Media Library" };
export const dynamic = "force-dynamic";

export default async function MediaLibraryPage() {
  const items = await listMedia();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Media Library</h1>
          <p className="text-sm text-slate mt-1">General-purpose uploads, stored in Cloudflare R2.</p>
        </div>
        <MediaLibraryUploader />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<ImageIcon size={28} />} title="No media uploaded yet" description="Files uploaded here are separate from images attached directly to news, events, and other content." />
      ) : (
        <MediaGrid items={items} />
      )}
    </div>
  );
}
