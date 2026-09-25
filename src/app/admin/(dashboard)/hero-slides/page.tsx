import { requireCapability } from "@/lib/auth/admin";
import Link from "next/link";
import { GalleryHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Common";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { HeroSlideRowActions } from "@/components/admin/HeroSlideRowActions";
import { listHeroSlidesForAdmin } from "@/lib/services/content-service";
import { DataTable, type Column } from "@/components/admin/DataTable";

export const metadata = { title: "Hero Slides" };
export const dynamic = "force-dynamic";

export default async function AdminHeroSlidesPage() {
  await requireCapability("content.hero");
  const slides = await listHeroSlidesForAdmin();

  const columns: Column<(typeof slides)[number]>[] = [
    {
      header: "Slide",
      cell: (slide) => (
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="w-14 h-9 rounded-md border border-line shrink-0 bg-cover bg-center"
            style={{
              backgroundColor: slide.backgroundColor ?? "#14153D",
              backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined,
            }}
          />
          <span className="min-w-0">
            <Link
              href={`/admin/hero-slides/${slide.id}`}
              className="font-medium text-primary-950 hover:text-accent-600"
            >
              {slide.title}
            </Link>
            {slide.subtitle && <span className="block text-xs text-slate">{slide.subtitle}</span>}
          </span>
        </span>
      ),
    },
    { header: "Button", cell: (slide) => slide.ctaText || "—" },
    { header: "Order", cell: (slide) => <span className="font-data text-xs">{slide.order}</span> },
    {
      header: "Status",
      cell: (slide) => (
        <StatusBadge status={slide.isActive ? "ACTIVE" : "INACTIVE"} label={slide.isActive ? "Showing" : "Hidden"} />
      ),
    },
    {
      header: "Actions",
      actions: true,
      cell: (slide) => <HeroSlideRowActions id={slide.id} title={slide.title} isActive={slide.isActive} />,
    },
  ];

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

      {slides.length === 0 ? (
        <EmptyState
          icon={<GalleryHorizontal size={28} />}
          title="No hero slides yet"
          description="Add your first slide to fill the homepage banner."
        />
      ) : (
        <DataTable caption="Hero slides" rows={slides} rowKey={(slide) => slide.id} columns={columns} />
      )}

      <p className="mt-5 text-sm text-slate max-w-2xl">
        Slides run from the lowest display order to the highest. Each one can use an image or a solid colour
        background — the text switches between light and dark automatically so it stays readable.
      </p>
    </div>
  );
}
