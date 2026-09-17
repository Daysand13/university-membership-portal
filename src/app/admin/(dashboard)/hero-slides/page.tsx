import Link from "next/link";
import { GalleryHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Common";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { HeroSlideRowActions } from "@/components/admin/HeroSlideRowActions";
import { listHeroSlidesForAdmin } from "@/lib/services/content-service";

export const metadata = { title: "Hero Slides" };
export const dynamic = "force-dynamic";

export default async function AdminHeroSlidesPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const [slides, { created }] = await Promise.all([listHeroSlidesForAdmin(), searchParams]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Hero Slides</h1>
          <p className="text-sm text-slate mt-1">
            {slides.length} slide{slides.length === 1 ? "" : "s"} in the rotating banner at the top of the homepage.
          </p>
        </div>
        <Link href="/admin/hero-slides/new">
          <Button>
            <Plus size={16} aria-hidden="true" /> New Slide
          </Button>
        </Link>
      </div>

      {created === "1" && (
        <div role="status" className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
          Slide created.
        </div>
      )}

      {slides.length === 0 ? (
        <EmptyState
          icon={<GalleryHorizontal size={28} />}
          title="No hero slides yet"
          description="Add your first slide to fill the homepage banner."
        />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Slide</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Button</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Order</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {slides.map((slide) => (
                <tr key={slide.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3 max-w-md">
                      <span
                        aria-hidden="true"
                        className="w-14 h-9 rounded-md border border-line shrink-0 bg-cover bg-center"
                        style={{
                          backgroundColor: slide.backgroundColor ?? "#14153D",
                          backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined,
                        }}
                      />
                      <div className="min-w-0">
                        <Link href={`/admin/hero-slides/${slide.id}`} className="font-medium text-primary-950 hover:text-accent-600">
                          {slide.title}
                        </Link>
                        {slide.subtitle && <p className="text-xs text-slate truncate">{slide.subtitle}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{slide.ctaText || "—"}</td>
                  <td className="px-5 py-3.5 text-slate font-data text-xs">{slide.order}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={slide.isActive ? "ACTIVE" : "INACTIVE"} label={slide.isActive ? "Showing" : "Hidden"} />
                  </td>
                  <td className="px-5 py-3.5">
                    <HeroSlideRowActions id={slide.id} title={slide.title} isActive={slide.isActive} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-5 text-sm text-slate max-w-2xl">
        Slides run from the lowest display order to the highest. Each one can use an image or a solid colour
        background — the text switches between light and dark automatically so it stays readable.
      </p>
    </div>
  );
}
