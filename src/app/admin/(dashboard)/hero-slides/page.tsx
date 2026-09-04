import { GalleryHorizontal, Trash2 } from "lucide-react";
import { HeroSlideForm } from "@/components/admin/forms/HeroSlideForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { EmptyState } from "@/components/ui/Common";
import { listHeroSlidesForAdmin } from "@/lib/services/content-service";
import { deleteHeroSlideAction } from "@/lib/actions/content-actions";

export const metadata = { title: "Hero Slides" };
export const dynamic = "force-dynamic";

export default async function AdminHeroSlidesPage() {
  const slides = await listHeroSlidesForAdmin();

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Hero Slides</h1>
        <p className="text-sm text-slate mt-1">
          These control the rotating banner at the top of the homepage. Each slide can use an image or a solid
          color background — text automatically switches between light and dark for readability.
        </p>
      </div>

      {slides.length === 0 ? (
        <EmptyState
          icon={<GalleryHorizontal size={28} />}
          title="No hero slides yet"
          description="Add your first slide below."
        />
      ) : (
        <div className="space-y-4 mb-8">
          {slides.map((slide) => (
            <div key={slide.id} className="bg-white rounded-lg border border-line p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-md border border-line shrink-0 bg-cover bg-center"
                    style={{
                      backgroundColor: slide.backgroundColor ?? "#14153D",
                      backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined,
                    }}
                  />
                  <span className="text-sm font-semibold text-primary-950">{slide.title}</span>
                  {!slide.isActive && (
                    <span className="text-xs text-slate-light bg-surface-muted rounded-full px-2 py-0.5">
                      Inactive
                    </span>
                  )}
                </div>
                <ConfirmButton
                  action={deleteHeroSlideAction.bind(null, slide.id)}
                  confirmMessage={`Remove the "${slide.title}" slide?`}
                  className="p-2 rounded-md text-slate hover:bg-danger-light hover:text-danger"
                >
                  <Trash2 size={15} />
                </ConfirmButton>
              </div>
              <HeroSlideForm slide={slide} />
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface-muted rounded-lg border border-dashed border-line p-5">
        <h2 className="text-sm font-semibold text-primary-950 mb-4">Add a New Slide</h2>
        <HeroSlideForm />
      </div>
    </div>
  );
}
