import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, SquareArrowOutUpRight, Trash2 } from "lucide-react";
import { requireCapability } from "@/lib/auth/admin";
import { getTutorial } from "@/lib/services/tutorial-service";
import { deleteTutorialAction } from "@/lib/actions/outreach-admin-actions";
import { TutorialForm } from "@/components/admin/forms/OutreachForms";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { tutorialSourceLabel } from "@/lib/outreach-options";

export const metadata = { title: "Edit Tutorial" };
export const dynamic = "force-dynamic";

export default async function EditTutorialPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("outreach.software");
  const { id } = await params;
  const tutorial = await getTutorial(id);
  if (!tutorial) notFound();

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/tech-tutorials/tutorials"
        className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4"
      >
        <ChevronLeft size={16} aria-hidden="true" /> Tutorials
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="font-display font-bold text-2xl text-primary-950">{tutorial.title}</h1>
        <ConfirmButton
          action={deleteTutorialAction.bind(null, tutorial.id)}
          confirmMessage={`Remove ${tutorial.title} from the page? The video itself stays on ${tutorialSourceLabel(tutorial.source)}.`}
          className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-light"
        >
          <Trash2 size={14} aria-hidden="true" /> Delete
        </ConfirmButton>
      </div>
      <p className="text-sm text-slate mb-6">
        <a
          href={tutorial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600"
        >
          <SquareArrowOutUpRight size={14} aria-hidden="true" /> Watch it on {tutorialSourceLabel(tutorial.source)}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
      <div className="bg-white rounded-lg border border-line p-6">
        <TutorialForm
          tutorial={{
            id: tutorial.id,
            title: tutorial.title,
            description: tutorial.description,
            source: tutorial.source,
            url: tutorial.url,
            thumbnailUrl: tutorial.thumbnailUrl,
            category: tutorial.category,
            durationLabel: tutorial.durationLabel,
            order: tutorial.order,
            isActive: tutorial.isActive,
          }}
        />
      </div>
    </div>
  );
}
