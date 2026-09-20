import Link from "next/link";
import { PlaySquare, Plus } from "lucide-react";
import { requireCapability } from "@/lib/auth/admin";
import { listTutorialsForAdmin } from "@/lib/services/tutorial-service";
import { TechTutorialsSectionNav } from "@/components/admin/OutreachSectionNav";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { softwareCategoryLabel, tutorialSourceLabel } from "@/lib/outreach-options";

export const metadata = { title: "Tutorials" };
export const dynamic = "force-dynamic";

export default async function AdminTutorialsPage() {
  await requireCapability("outreach.software");
  const tutorials = await listTutorialsForAdmin();

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
        <div className="bg-white rounded-lg border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Tutorial</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Where</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Helps with</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Length</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tutorials.map((tutorial) => (
                <tr key={tutorial.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/tech-tutorials/tutorials/${tutorial.id}`}
                      className="font-medium text-primary-950 hover:text-accent-600"
                    >
                      {tutorial.title}
                    </Link>
                    <p className="text-xs text-slate line-clamp-1 max-w-xs">{tutorial.description}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{tutorialSourceLabel(tutorial.source)}</td>
                  <td className="px-5 py-3.5 text-slate">
                    {tutorial.category ? softwareCategoryLabel(tutorial.category) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate">{tutorial.durationLabel ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge
                      status={tutorial.isActive ? "ACTIVE" : "INACTIVE"}
                      label={tutorial.isActive ? "Showing" : "Hidden"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
