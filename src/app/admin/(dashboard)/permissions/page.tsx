import Link from "next/link";
import { ChevronLeft, ShieldCheck, UserCog } from "lucide-react";
import { requireCapability } from "@/lib/auth/admin";
import { listAdminAccounts } from "@/lib/services/admin-permission-service";
import { PermissionManager } from "@/components/admin/forms/PermissionManager";
import { EmptyState } from "@/components/ui/Common";
import { CAPABILITY_MODULES } from "@/lib/auth/capabilities";
import { roleLabel } from "@/lib/auth/role-labels";
import { AddAdminForm, AdminAccountActions } from "@/components/admin/forms/AdminAccountForms";

export const metadata = { title: "Administrator Accounts" };
export const dynamic = "force-dynamic";

const TOTAL_CAPABILITIES = CAPABILITY_MODULES.reduce((sum, group) => sum + group.capabilities.length, 0);

export default async function AdminPermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const actor = await requireCapability("site.permissions");
  const { account } = await searchParams;
  const admins = await listAdminAccounts();
  const selected = admins.find((a) => a.id === account);

  return (
    <div>
      <Link href="/admin/team" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={15} aria-hidden="true" /> Leadership
      </Link>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">Administrator Accounts</h1>
      <p className="text-sm text-slate mb-8 max-w-2xl">
        Every account that can sign in to the admin area. An executive&apos;s privileges are better set on their own
        profile under Leadership, where the rest of their details live; this page is for the accounts that aren&apos;t
        behind a listing, and for adding one.
      </p>

      {admins.length === 0 ? (
        <EmptyState icon={<UserCog size={28} />} title="No administrator accounts" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] items-start">
          <nav aria-label="Administrator accounts" className="bg-white rounded-lg border border-line overflow-hidden">
            <p className="px-4 py-3 border-b border-line text-xs font-semibold uppercase tracking-wide text-slate">
              Accounts
            </p>
            <ul className="divide-y divide-line">
              {admins.map((admin) => {
                const isSelected = admin.id === selected?.id;
                return (
                  <li key={admin.id}>
                    <Link
                      href={`/admin/permissions?account=${admin.id}`}
                      aria-current={isSelected ? "true" : undefined}
                      className={`block px-4 py-3 hover:bg-surface-muted ${isSelected ? "bg-surface-muted" : ""}`}
                    >
                      <span className="block text-sm font-semibold text-primary-950 truncate">
                        {admin.name}
                        {admin.id === actor.id && <span className="text-slate font-normal"> (you)</span>}
                      </span>
                      <span className="block text-xs text-slate truncate">{admin.email}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate">
                        <span className="font-medium text-ink">{roleLabel(admin.role)}</span>
                        {admin.role === "SUPER_ADMIN" ? (
                          <span className="inline-flex items-center gap-1 text-primary-800">
                            <ShieldCheck size={12} aria-hidden="true" /> Everything
                          </span>
                        ) : (
                          <span>
                            {admin.capabilities.length} of {TOTAL_CAPABILITIES}
                          </span>
                        )}
                        {Object.keys(admin.overrides).length > 0 && (
                          <span className="rounded-full bg-accent-100 px-2 py-0.5 font-semibold text-primary-950">
                            {Object.keys(admin.overrides).length} changed
                          </span>
                        )}
                        {!admin.isActive ? (
                          <span className="text-danger">Deactivated</span>
                        ) : (
                          !admin.lastLoginAt && <span className="text-accent-700">Invitation pending</span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <AddAdminForm />
          </nav>

          <div>
            {!selected ? (
              <EmptyState
                icon={<UserCog size={28} />}
                title="Choose an account"
                description="Pick an administrator on the left to see and change what they can do."
              />
            ) : selected.id === actor.id ? (
              <div className="bg-white rounded-lg border border-line p-6">
                <h2 className="font-display font-bold text-lg text-primary-950">{selected.name}</h2>
                <p className="text-sm text-slate mt-2">
                  This is your own account. Nobody can change their own permissions — otherwise one wrong toggle
                  would lock you out of this screen. Ask another super administrator to make the change.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display font-bold text-lg text-primary-950">{selected.name}</h2>
                    <p className="text-sm text-slate">
                      {selected.email}
                      {!selected.isActive && <span className="text-danger"> · Deactivated, can&apos;t sign in</span>}
                      {selected.isActive && !selected.lastLoginAt && (
                        <span className="text-accent-700"> · Hasn&apos;t set a password yet</span>
                      )}
                    </p>
                  </div>
                  <AdminAccountActions
                    adminId={selected.id}
                    name={selected.name}
                    email={selected.email}
                    isActive={selected.isActive}
                    hasSignedIn={Boolean(selected.lastLoginAt)}
                  />
                </div>
                <PermissionManager
                  key={selected.id}
                  target={{
                    id: selected.id,
                    name: selected.name,
                    email: selected.email,
                    role: selected.role,
                    capabilities: selected.capabilities,
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
