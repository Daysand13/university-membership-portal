import Link from "next/link";
import { Handshake, Plus, Settings2 } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getAlliesPageSettings, listAlliesForAdmin } from "@/lib/services/ally-service";
import { AlliesSectionNav } from "@/components/admin/OutreachSectionNav";
import { AlliesSettingsForm } from "@/components/admin/forms/OutreachForms";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Allies & Champions" };
export const dynamic = "force-dynamic";

export default async function AdminAlliesPage() {
  await requireAdminRole(AdminRole.EDITOR, AdminRole.MEMBERSHIP_OFFICER);
  const [allies, settings] = await Promise.all([listAlliesForAdmin(), getAlliesPageSettings()]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Allies &amp; Champions</h1>
          <p className="text-sm text-slate mt-1">
            The people and organisations shown on the public{" "}
            <Link href="/allies" target="_blank" className="font-semibold text-primary-800 hover:text-accent-600">
              Allies page
            </Link>
            .
          </p>
        </div>
        <Link href="/admin/allies/new">
          <Button>
            <Plus size={16} aria-hidden="true" /> Add Ally
          </Button>
        </Link>
      </div>
      <AlliesSectionNav current="listings" />

      {allies.length === 0 ? (
        <EmptyState
          icon={<Handshake size={28} />}
          title="No allies listed yet"
          description="Add a supporter yourself, or list someone from Sign-ups who asked to be shown."
        />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Ally</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Kind</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Spotlight</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Order</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {allies.map((ally) => (
                <tr key={ally.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-10 h-10 shrink-0 border border-line bg-[#ffffff] overflow-hidden flex items-center justify-center ${
                          ally.type === "CORPORATE" ? "rounded-md" : "rounded-full"
                        }`}
                      >
                        {ally.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ally.imageUrl}
                            alt=""
                            className={ally.type === "CORPORATE" ? "max-w-full max-h-full object-contain" : "w-full h-full object-cover"}
                          />
                        ) : null}
                      </span>
                      <div className="min-w-0">
                        <Link href={`/admin/allies/${ally.id}`} className="font-medium text-primary-950 hover:text-accent-600">
                          {ally.name}
                        </Link>
                        <p className="text-xs text-slate truncate max-w-xs">
                          {ally.type === "CORPORATE" ? ally.sector : [ally.role, ally.organization].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{ally.type === "CORPORATE" ? "Organisation" : "Individual"}</td>
                  <td className="px-5 py-3.5 text-slate">{ally.featured ? "Featured" : "—"}</td>
                  <td className="px-5 py-3.5 text-slate font-data text-xs">{ally.order}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={ally.isActive ? "ACTIVE" : "INACTIVE"} label={ally.isActive ? "Showing" : "Hidden"} />
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
        <AlliesSettingsForm settings={settings} />
      </section>
    </div>
  );
}
