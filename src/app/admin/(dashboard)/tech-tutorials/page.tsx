import Link from "next/link";
import { MonitorSmartphone, Plus, Settings2 } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getAssistiveTechSettings, listSoftwareForAdmin } from "@/lib/services/assistive-software-service";
import { TechTutorialsSectionNav } from "@/components/admin/OutreachSectionNav";
import { AssistiveSettingsForm } from "@/components/admin/forms/OutreachForms";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/Button";
import { softwareCategoryLabel, softwarePlatformLabel } from "@/lib/outreach-options";

export const metadata = { title: "Tech & Tutorials" };
export const dynamic = "force-dynamic";

export default async function AdminTechTutorialsPage() {
  await requireCapability("outreach.software");
  const [software, settings] = await Promise.all([listSoftwareForAdmin(), getAssistiveTechSettings()]);

  const columns: Column<(typeof software)[number]>[] = [
    {
      header: "Software",
      cell: (tool) => (
        <>
          <Link
            href={`/admin/tech-tutorials/${tool.id}`}
            className="font-medium text-primary-950 hover:text-accent-600"
          >
            {tool.name}
          </Link>
          <span className="block text-xs text-slate line-clamp-2">{tool.description}</span>
        </>
      ),
    },
    { header: "Category", cell: (tool) => softwareCategoryLabel(tool.category) },
    { header: "Platforms", cell: (tool) => tool.platforms.map(softwarePlatformLabel).join(", ") || "—" },
    { header: "Licence", cell: (tool) => (tool.isFree ? "Free" : "Funded") },
    {
      header: "Status",
      cell: (tool) => (
        <StatusBadge status={tool.isActive ? "ACTIVE" : "INACTIVE"} label={tool.isActive ? "Showing" : "Hidden"} />
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Tech &amp; Tutorials</h1>
          <p className="text-sm text-slate mt-1">
            The software on the public{" "}
            <Link href="/tech-tutorials" target="_blank" className="font-semibold text-primary-800 hover:text-accent-600">
              Tech &amp; Tutorials page
            </Link>
            , where it points, and the page&apos;s settings. Video walk-throughs are on the Tutorials tab.
          </p>
        </div>
        <Link href="/admin/tech-tutorials/new">
          <Button>
            <Plus size={16} aria-hidden="true" /> Add Software
          </Button>
        </Link>
      </div>
      <TechTutorialsSectionNav current="software" />

      {!settings.telegramUrl && (
        <div className="mb-5 rounded-lg border border-accent-400 bg-accent-50 px-4 py-3 text-sm text-primary-950">
          The Telegram library link isn&apos;t set yet, so the page&apos;s Telegram buttons say it&apos;s coming soon. Add
          it in the settings below.
        </div>
      )}

      {software.length === 0 ? (
        <EmptyState
          icon={<MonitorSmartphone size={28} />}
          title="The directory is empty"
          description="Add the tools in the Telegram library so students can find them by need and platform."
        />
      ) : (
        <DataTable caption="Assistive software" rows={software} rowKey={(tool) => tool.id} columns={columns} />
      )}

      <section className="mt-8 max-w-2xl bg-white rounded-lg border border-line p-6">
        <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-4">
          <Settings2 size={18} aria-hidden="true" /> Page settings
        </h2>
        <AssistiveSettingsForm settings={settings} />
      </section>
    </div>
  );
}
