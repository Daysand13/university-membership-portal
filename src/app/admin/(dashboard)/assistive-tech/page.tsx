import Link from "next/link";
import { MonitorSmartphone, Plus, Settings2 } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getAssistiveTechSettings, listSoftwareForAdmin } from "@/lib/services/assistive-software-service";
import { AssistiveTechSectionNav } from "@/components/admin/OutreachSectionNav";
import { AssistiveSettingsForm } from "@/components/admin/forms/OutreachForms";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { softwareCategoryLabel, softwarePlatformLabel } from "@/lib/outreach-options";

export const metadata = { title: "Assistive Software" };
export const dynamic = "force-dynamic";

export default async function AdminAssistiveTechPage() {
  await requireAdminRole(AdminRole.EDITOR, AdminRole.MEMBERSHIP_OFFICER);
  const [software, settings] = await Promise.all([listSoftwareForAdmin(), getAssistiveTechSettings()]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Assistive Software</h1>
          <p className="text-sm text-slate mt-1">
            The directory on the public{" "}
            <Link href="/assistive-technology" target="_blank" className="font-semibold text-primary-800 hover:text-accent-600">
              Assistive Software page
            </Link>
            , and where it points.
          </p>
        </div>
        <Link href="/admin/assistive-tech/new">
          <Button>
            <Plus size={16} aria-hidden="true" /> Add Software
          </Button>
        </Link>
      </div>
      <AssistiveTechSectionNav current="directory" />

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
        <div className="bg-white rounded-lg border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Software</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Category</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Platforms</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Licence</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {software.map((tool) => (
                <tr key={tool.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/assistive-tech/${tool.id}`} className="font-medium text-primary-950 hover:text-accent-600">
                      {tool.name}
                    </Link>
                    <p className="text-xs text-slate line-clamp-1 max-w-xs">{tool.description}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{softwareCategoryLabel(tool.category)}</td>
                  <td className="px-5 py-3.5 text-slate">{tool.platforms.map(softwarePlatformLabel).join(", ") || "—"}</td>
                  <td className="px-5 py-3.5 text-slate">{tool.isFree ? "Free" : "Funded"}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={tool.isActive ? "ACTIVE" : "INACTIVE"} label={tool.isActive ? "Showing" : "Hidden"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
