import Link from "next/link";
import { Users, Trash2, FileDown } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { listMembers, getMemberFilterOptions } from "@/lib/services/membership-service";
import { deleteMemberAction } from "@/lib/actions/membership-actions";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { MEMBERSHIP_TYPE_LABELS } from "@/lib/validations/membership";

export const metadata = { title: "Members" };
export const dynamic = "force-dynamic";

interface MembersSearchParams {
  q?: string;
  department?: string;
  programme?: string;
  membershipType?: string;
  gender?: string;
  track?: string;
  campus?: string;
  status?: string;
  from?: string;
  to?: string;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<MembersSearchParams> }) {
  const sp = await searchParams;
  const [members, filterOptions, currentAdmin] = await Promise.all([
    listMembers({
      search: sp.q,
      academicDepartment: sp.department,
      programme: sp.programme,
      membershipType: sp.membershipType,
      gender: sp.gender,
      applicationTrack: sp.track,
      campus: sp.campus,
      status: sp.status,
      dateFrom: sp.from,
      dateTo: sp.to,
    }),
    getMemberFilterOptions(),
    getCurrentAdmin(),
  ]);

  const canDelete = currentAdmin?.role === "SUPER_ADMIN";

  // Preserve every active filter when linking to the PDF export, so
  // "Export PDF" always reflects exactly what's on screen.
  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value) exportParams.set(key, value);
  }

  const selectClasses =
    "rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Members</h1>
          <p className="text-sm text-slate mt-1">{members.length} member{members.length === 1 ? "" : "s"}</p>
        </div>
        <a
          href={`/api/admin/members/export?${exportParams.toString()}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3.5 py-2 text-sm font-semibold text-primary-800 hover:border-primary-600 hover:text-accent-600"
        >
          <FileDown size={15} /> Export PDF
        </a>
      </div>

      <form className="mb-6 bg-white rounded-lg border border-line p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          name="q"
          defaultValue={sp.q}
          placeholder="Search by name, index number, email…"
          className={`${selectClasses} lg:col-span-2`}
        />
        <select name="department" defaultValue={sp.department ?? ""} className={selectClasses}>
          <option value="">All Departments</option>
          {filterOptions.departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select name="programme" defaultValue={sp.programme ?? ""} className={selectClasses}>
          <option value="">All Programmes</option>
          {filterOptions.programmes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select name="membershipType" defaultValue={sp.membershipType ?? ""} className={selectClasses}>
          <option value="">All Membership Types</option>
          {Object.entries(MEMBERSHIP_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select name="gender" defaultValue={sp.gender ?? ""} className={selectClasses}>
          <option value="">All Genders</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
        <select name="track" defaultValue={sp.track ?? ""} className={selectClasses}>
          <option value="">Undergraduate & Postgraduate</option>
          <option value="UNDERGRADUATE">Undergraduate</option>
          <option value="POSTGRADUATE">Postgraduate</option>
        </select>
        <select name="campus" defaultValue={sp.campus ?? ""} className={selectClasses}>
          <option value="">All Campuses</option>
          {filterOptions.campuses.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className={selectClasses}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-light shrink-0">Joined from</label>
          <input type="date" name="from" defaultValue={sp.from} className={`${selectClasses} w-full`} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-light shrink-0">to</label>
          <input type="date" name="to" defaultValue={sp.to} className={`${selectClasses} w-full`} />
        </div>
        <div className="flex items-center gap-2 lg:col-span-2">
          <button type="submit" className="rounded-md bg-primary-800 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-900">
            Apply Filters
          </button>
          <Link href="/admin/members" className="text-sm text-slate hover:text-primary-800">
            Clear
          </Link>
        </div>
      </form>

      {members.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="No members match these filters" />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Index Number</th>
                <th className="text-left px-5 py-3 font-semibold">Programme</th>
                <th className="text-left px-5 py-3 font-semibold">Membership Type</th>
                <th className="text-left px-5 py-3 font-semibold">Joined</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-primary-950">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-slate-light">{member.email}</p>
                  </td>
                  <td className="px-5 py-3.5 font-data text-xs text-ink">{member.indexNumber}</td>
                  <td className="px-5 py-3.5 text-slate">{member.programme}</td>
                  <td className="px-5 py-3.5 text-slate">
                    {member.membershipType ? MEMBERSHIP_TYPE_LABELS[member.membershipType] : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-light text-xs">{formatDate(member.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={member.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <Link href={`/admin/members/${member.id}`} className="text-sm font-semibold text-primary-800 hover:text-accent-600 mr-3">
                      View
                    </Link>
                    {canDelete && (
                      <ConfirmButton
                        action={deleteMemberAction.bind(null, member.id)}
                        confirmMessage={`Permanently delete ${member.firstName} ${member.lastName}? This cannot be undone.`}
                        className="inline-flex items-center text-danger hover:text-danger align-middle"
                      >
                        <Trash2 size={15} />
                      </ConfirmButton>
                    )}
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
