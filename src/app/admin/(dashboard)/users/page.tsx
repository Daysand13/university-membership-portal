import Link from "next/link";
import { Users, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/Common";
import { listUsersForMatrix } from "@/lib/services/user-admin-service";
import { UserSuperpowerControls } from "@/components/admin/UserSuperpowerControls";
import { formatFullName } from "@/lib/format";
import type { UserRoleName } from "@/generated/prisma/enums";

export const metadata = { title: "User Status Matrix" };
export const dynamic = "force-dynamic";

const ROLE_STYLES: Record<string, string> = {
  MEMBER: "bg-primary-50 text-primary-800",
  ALUMNI: "bg-accent-50 text-accent-600",
  ADMIN: "bg-warning-light text-warning",
};

const ROLE_TABS: { value: UserRoleName | ""; label: string }[] = [
  { value: "", label: "Everyone" },
  { value: "MEMBER", label: "Students" },
  { value: "ALUMNI", label: "Alumni" },
  { value: "ADMIN", label: "Admins" },
];

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${ROLE_STYLES[role] ?? "bg-surface-muted text-slate"}`}>
      {role === "MEMBER" ? "Student" : role === "ALUMNI" ? "Alumni" : "Admin"}
    </span>
  );
}

export default async function UserMatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const sp = await searchParams;
  const role = (["MEMBER", "ALUMNI", "ADMIN"] as const).includes(sp.role as never)
    ? (sp.role as UserRoleName)
    : undefined;

  const users = await listUsersForMatrix({ search: sp.q, role });

  const dualCount = users.filter(
    (u) => u.roles.some((r) => r.role === "MEMBER") && u.roles.some((r) => r.role === "ALUMNI"),
  ).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">User Status Matrix</h1>
        <p className="text-sm text-slate mt-1">
          One row per person, with every standing they hold. {users.length} shown
          {dualCount > 0 && ` · ${dualCount} with dual status`}.
        </p>
      </div>

      <form className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-light" />
          <input
            type="search"
            name="q"
            defaultValue={sp.q}
            placeholder="Search by name, email, or any index number…"
            className="w-full rounded-md border border-line bg-white pl-9 pr-3.5 py-2 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
          />
        </div>
        {role && <input type="hidden" name="role" value={role} />}
        <button type="submit" className="rounded-md bg-primary-800 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-900">
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {ROLE_TABS.map((tab) => {
          const params = new URLSearchParams();
          if (sp.q) params.set("q", sp.q);
          if (tab.value) params.set("role", tab.value);
          const active = (role ?? "") === tab.value;
          return (
            <Link
              key={tab.label}
              href={`/admin/users${params.toString() ? `?${params}` : ""}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium border ${
                active ? "bg-primary-800 text-white border-primary-800" : "bg-white border-line text-slate hover:border-primary-300"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {users.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="No users match this search" />
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const activeCycle = u.enrollments.find((e) => e.status === "ACTIVE");
            const pastCycles = u.enrollments.filter((e) => e.status !== "ACTIVE");
            const roles = u.roles.map((r) => r.role);

            return (
              <div key={u.id} className="bg-white rounded-lg border border-line p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display font-bold text-base text-primary-950">
                        {formatFullName(u.firstName, u.middleName, u.lastName)}
                      </p>
                      {roles.map((r) => (
                        <RoleBadge key={r} role={r} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-light mt-0.5">{u.email}</p>
                  </div>
                  {u.member && (
                    <Link
                      href={`/admin/members/${u.member.id}`}
                      className="text-sm font-semibold text-primary-800 hover:text-accent-600 shrink-0"
                    >
                      View member record
                    </Link>
                  )}
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-light uppercase tracking-wide">Current Index No.</dt>
                    <dd className="font-data text-ink mt-0.5">
                      {activeCycle?.indexNumber ?? u.member?.indexNumber ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-light uppercase tracking-wide">Programme</dt>
                    <dd className="text-ink mt-0.5">{activeCycle?.programme ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-light uppercase tracking-wide">Level</dt>
                    <dd className="text-ink mt-0.5">{activeCycle?.level ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-light uppercase tracking-wide">Class of</dt>
                    <dd className="text-ink mt-0.5">{u.alumniProfile?.graduationYear ?? "—"}</dd>
                  </div>
                </dl>

                {pastCycles.length > 0 && (
                  <p className="text-xs text-slate-light mb-3">
                    Previous studies:{" "}
                    {pastCycles.map((c) => `${c.indexNumber} (${c.programme})`).join(" · ")}
                  </p>
                )}

                <UserSuperpowerControls
                  target={{
                    userId: u.id,
                    name: formatFullName(u.firstName, u.middleName, u.lastName),
                    email: u.email,
                    roles,
                    currentIndexNumber: activeCycle?.indexNumber ?? u.member?.indexNumber ?? null,
                    hasMemberRecord: Boolean(u.member),
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
