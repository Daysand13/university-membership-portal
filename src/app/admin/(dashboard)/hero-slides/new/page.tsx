import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { HeroSlideForm } from "@/components/admin/forms/HeroSlideForm";

export const metadata = { title: "New Hero Slide" };
export const dynamic = "force-dynamic";

export default function NewHeroSlidePage() {
  return (
    <div className="max-w-3xl">
      <Link href="/admin/hero-slides" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Hero Slides
      </Link>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">New Hero Slide</h1>
      <div className="bg-white rounded-lg border border-line p-6">
        <HeroSlideForm />
      </div>
    </div>
  );
}
