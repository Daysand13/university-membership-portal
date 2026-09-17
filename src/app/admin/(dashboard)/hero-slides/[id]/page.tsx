import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { HeroSlideForm } from "@/components/admin/forms/HeroSlideForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { deleteHeroSlideAction } from "@/lib/actions/content-actions";
import { getHeroSlideForAdmin } from "@/lib/services/content-service";

export const metadata = { title: "Edit Hero Slide" };
export const dynamic = "force-dynamic";

export default async function EditHeroSlidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slide = await getHeroSlideForAdmin(id);
  if (!slide) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/hero-slides" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Hero Slides
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Edit {slide.title}</h1>
        <ConfirmButton
          action={deleteHeroSlideAction.bind(null, slide.id)}
          confirmMessage={`Remove the "${slide.title}" slide? This can't be undone.`}
          className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-light"
        >
          <Trash2 size={14} aria-hidden="true" /> Delete
        </ConfirmButton>
      </div>
      <div className="bg-white rounded-lg border border-line p-6">
        <HeroSlideForm slide={slide} />
      </div>
    </div>
  );
}
