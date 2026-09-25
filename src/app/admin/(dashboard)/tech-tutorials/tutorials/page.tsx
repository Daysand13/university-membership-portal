import Link from "next/link";
import { PlaySquare, Plus } from "lucide-react";
import { requireCapability } from "@/lib/auth/admin";
import { listTutorialsForAdmin } from "@/lib/services/tutorial-service";
import { TechTutorialsSectionNav } from "@/components/admin/OutreachSectionNav";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/Button";
import { softwareCategoryLabel, tutorialSourceLabel } from "@/lib/outreach-options";

export const metadata = { title: "Tutorials" };
export const dynamic = "force-dynamic";

export default async function AdminTutorialsPage() {
  await requireCapability("outreach.software");
  const tutorials = await listTutorialsForAdmin();

  const columns: Column<(typeof tutorials)[number]>[] = [
    {
      header: "Tutorial",
      cell: (tutorial) => (
        <>
          <Link
            href={`/admin/tech-tutorials/tutorials/${tutorial.id}`}
            className="font-medium text-primary-950 hover:text-accent-600"
          >
            {tutorial.title}
          </Link>
          <span className="block text-xs text-slate line-clamp-2">{tutorial.description}</span>
        </>
      ),
    },
    { header: "Where", cell: (tutorial) => tutorialSourceLabel(tutorial.source) },
    { header: "Helps with", cell: (tutorial) => (tutorial.category ? softwareCategoryLabel(tutorial.category) : "—") },
    { header: "Length", cell: (tutorial) => tutorial.durationLabel ?? "—" },
    {
      header: "Status",
      cell: (tutorial) => (
        <StatusBadge
          status={tutorial.isActive ? "ACTIVE" : "INACTIVE"}
          label={tutorial.isActive ? "Showing" : "Hidden"}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Tech &amp; Tutorials</h1>
          <p className="text-sm text-slate mt-1">
            The video walk-throughs on the public{" "}
            <Link href="/tech-tutorials" target="_blank" className="font-semibold text-primary-800 hover:text-accent-600">
              Tech &amp; Tutorials page
            </Link>
            . The videos stay on YouTube and TikTok; this is what points at them.
          </p>
        </div>
        <Link href="/admin/tech-tutorials/tutorials/new">
          <Button>
            <Plus size={16} aria-hidden="true" /> Add Tutorial
          </Button>
        </Link>
      </div>
      <TechTutorialsSectionNav current="tutorials" />

      {tutorials.length === 0 ? (
        <EmptyState
          icon={<PlaySquare size={28} />}
          title="No tutorials yet"
          description="Add a YouTube or TikTok video and it appears on the page, alongside the software."
        />
      ) : (
        <DataTable caption="Tutorials" rows={tutorials} rowKey={(tutorial) => tutorial.id} columns={columns} />
      )}
    </div>
  );
}
