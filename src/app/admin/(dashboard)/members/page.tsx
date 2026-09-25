import Link from "next/link";
import { Users, Trash2, FileDown } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FilterActions, FilterBar, FilterField, FilterSearch, filterControlClasses } from "@/components/admin/FilterBar";
import { listMembers, getMemberFilterOptions, MEMBER_SORT_OPTIONS, type MemberSort } from "@/lib/services/membership-service";
import { deleteMemberAction } from "@/lib/actions/membership-actions";
import { getCurrentAdmin, requireCapability } from "@/lib/auth/admin";
import { MEMBERSHIP_TYPE_LABELS } from "@/lib/validations/membership";
import { formatFullName } from "@/lib/format";

const SORT_LABELS: Record<MemberSort, string> = {
  newest: "Date Joined (newest first)",
  oldest: "Date Joined (oldest first)",
  name: "Name (A–Z)",
};

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
  sort?: string;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<MembersSearchParams> }) {
  await requireCapability("members.records");
  const sp = await searchParams;
  const sort: MemberSort = (MEMBER_SORT_OPTIONS as readonly string[]).includes(sp.sort ?? "")
    ? (sp.sort as MemberSort)
    : "newest";
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
      sort,
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

  const columns: Column<(typeof members)[number]>[] = [
    {
      header: "Name",
      cell: (member) => (
        <>
          <p className="font-medium text-primary-950">
            {formatFullName(member.firstName, member.middleName, member.lastName)}
          </p>
          <p className="text-xs text-slate-light break-words">{member.email}</p>
        </>
      ),
    },
    { header: "Index Number", cell: (member) => <span className="font-data text-xs text-ink">{member.indexNumber}</span> },
    { header: "Programme", cell: (member) => member.programme },
    {
      header: "Membership Type",
      cell: (member) => (member.membershipType ? MEMBERSHIP_TYPE_LABELS[member.membershipType] : "—"),
    },
    { header: "Joined", cell: (member) => formatDate(member.createdAt) },
    { header: "Status", cell: (member) => <StatusBadge status={member.status} /> },
    {
      header: "Actions",
      actions: true,
      cell: (member) => (
        <>
          <Link
            href={`/admin/members/${member.id}`}
            className="text-sm font-semibold text-primary-800 hover:text-accent-600 mr-3"
          >
            View
          </Link>
          {canDelete && (
            <ConfirmButton
              action={deleteMemberAction.bind(null, member.id)}
              confirmMessage={`Permanently delete ${formatFullName(member.firstName, member.middleName, member.lastName)}? This cannot be undone.`}
              className="inline-flex items-center text-danger hover:text-danger align-middle"
            >
              <Trash2 size={15} aria-hidden="true" />
              <span className="sr-only">
                Delete {formatFullName(member.firstName, member.middleName, member.lastName)}
              </span>
            </ConfirmButton>
          )}
        </>
      ),
    },
  ];

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

      <FilterBar>
        <FilterSearch
          id="members-q"
          label="Search members"
          defaultValue={sp.q}
          placeholder="Name, index number, email…"
        />
        <FilterField id="members-department" label="Department">
          <select id="members-department" name="department" defaultValue={sp.department ?? ""} className={filterControlClasses}>
            <option value="">All departments</option>
            {filterOptions.departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </FilterField>
        <FilterField id="members-programme" label="Programme">
          <select id="members-programme" name="programme" defaultValue={sp.programme ?? ""} className={filterControlClasses}>
            <option value="">All programmes</option>
            {filterOptions.programmes.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </FilterField>
        <FilterField id="members-type" label="Membership type">
          <select id="members-type" name="membershipType" defaultValue={sp.membershipType ?? ""} className={filterControlClasses}>
            <option value="">All membership types</option>
            {Object.entries(MEMBERSHIP_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField id="members-gender" label="Gender">
          <select id="members-gender" name="gender" defaultValue={sp.gender ?? ""} className={filterControlClasses}>
            <option value="">All genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </FilterField>
        <FilterField id="members-track" label="Track">
          <select id="members-track" name="track" defaultValue={sp.track ?? ""} className={filterControlClasses}>
            <option value="">Undergraduate &amp; postgraduate</option>
            <option value="UNDERGRADUATE">Undergraduate</option>
            <option value="POSTGRADUATE">Postgraduate</option>
          </select>
        </FilterField>
        <FilterField id="members-campus" label="Campus">
          <select id="members-campus" name="campus" defaultValue={sp.campus ?? ""} className={filterControlClasses}>
            <option value="">All campuses</option>
            {filterOptions.campuses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FilterField>
        <FilterField id="members-status" label="Status">
          <select id="members-status" name="status" defaultValue={sp.status ?? ""} className={filterControlClasses}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </FilterField>
        <FilterField id="members-from" label="Joined from">
          <input id="members-from" type="date" name="from" defaultValue={sp.from} className={filterControlClasses} />
        </FilterField>
        <FilterField id="members-to" label="Joined up to">
          <input id="members-to" type="date" name="to" defaultValue={sp.to} className={filterControlClasses} />
        </FilterField>
        <FilterField id="members-sort" label="Order">
          <select id="members-sort" name="sort" defaultValue={sort} className={filterControlClasses}>
            {MEMBER_SORT_OPTIONS.map((s) => (
              <option key={s} value={s}>{SORT_LABELS[s]}</option>
            ))}
          </select>
        </FilterField>
        <FilterActions clearHref="/admin/members" />
      </FilterBar>

      {members.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="No members match these filters" />
      ) : (
        <DataTable caption="Members" rows={members} rowKey={(member) => member.id} columns={columns} />
      )}
    </div>
  );
}
