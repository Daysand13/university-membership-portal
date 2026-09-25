import Link from "next/link";
import { GraduationCap, Trash2, FileDown, Users, UserCheck, Heart, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/Common";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FilterActions, FilterBar, FilterField, FilterSearch, filterControlClasses } from "@/components/admin/FilterBar";
import { listAlumniForAdmin, ALUMNI_SORT_FIELDS, describeAlumniSource, type AlumniSortField } from "@/lib/services/alumni-service";
import { setAlumniStatusAction, deleteAlumniAction } from "@/lib/actions/alumni-actions";
import { getCurrentAdmin, requireCapability } from "@/lib/auth/admin";

export const metadata = { title: "Alumni" };
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

const SORT_LABELS: Record<AlumniSortField, string> = {
  name: "Name (A–Z)",
  graduationYear: "Graduation Year (newest first)",
  joined: "Date Joined (newest first)",
};

function StatTile({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-line p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-md bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-display font-bold text-primary-950 leading-none">{value}</p>
        <p className="text-xs text-slate mt-1">{label}</p>
      </div>
    </div>
  );
}

export default async function AdminAlumniPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  await requireCapability("members.alumni");
  const { q, sort: rawSort } = await searchParams;
  const sort: AlumniSortField | undefined = (ALUMNI_SORT_FIELDS as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as AlumniSortField)
    : undefined;
  const [alumni, currentAdmin] = await Promise.all([listAlumniForAdmin({ search: q, sort }), getCurrentAdmin()]);
  const canDelete = currentAdmin?.role === "SUPER_ADMIN";

  const activeCount = alumni.filter((a) => a.status === "ACTIVE").length;
  const mentorCount = alumni.filter((a) => a.willingToMentor).length;

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (sort) exportParams.set("sort", sort);

  const columns: Column<(typeof alumni)[number]>[] = [
    {
      header: "Name",
      cell: (a) => (
        <>
          <Link href={`/admin/alumni/${a.id}`} className="font-medium text-primary-950 hover:text-accent-600">
            {a.fullName}
          </Link>
          <p className="text-xs text-slate-light break-words">{a.email}</p>
        </>
      ),
    },
    { header: "Programme", cell: (a) => a.programme },
    { header: "Class of", cell: (a) => a.graduationYear },
    {
      header: "Source",
      cell: (a) =>
        ({
          "graduated-member": "Graduated member",
          "currently-enrolled": "Currently a member too",
          "self-registered": "Self-registered",
        })[describeAlumniSource(a)],
    },
    {
      header: "Public site",
      // Three distinct states, not two: private, public, and
      // public-and-featured. Showing them apart is what stops "public"
      // and "featured" being conflated.
      cell: (a) =>
        a.spotlight?.published ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 bg-accent-100 text-accent-700">
            <Star size={11} aria-hidden="true" /> Featured
          </span>
        ) : a.publicProfile ? (
          <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-primary-50 text-primary-800">Public</span>
        ) : (
          <span className="text-xs text-slate-light">Private</span>
        ),
    },
    {
      header: "Status",
      cell: (a) => (
        <form action={setAlumniStatusAction.bind(null, a.id, a.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>
          <button
            type="submit"
            className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
              a.status === "ACTIVE" ? "bg-success-light text-success" : "bg-danger-light text-danger"
            }`}
          >
            {a.status === "ACTIVE" ? "Active" : "Suspended"}
            <span className="sr-only"> — press to {a.status === "ACTIVE" ? "suspend" : "reactivate"} {a.fullName}</span>
          </button>
        </form>
      ),
    },
    { header: "Joined", cell: (a) => formatDate(a.createdAt) },
    {
      header: "Actions",
      actions: true,
      cell: (a) => (
        <>
          <Link
            href={`/admin/alumni/${a.id}/feature`}
            className="text-sm font-semibold text-primary-800 hover:text-accent-600 mr-3"
          >
            {a.spotlight ? "Edit spotlight" : "Feature"}
            <span className="sr-only"> — {a.fullName}</span>
          </Link>
          {canDelete && (
            <ConfirmButton
              action={deleteAlumniAction.bind(null, a.id)}
              confirmMessage={`Permanently delete the alumni account for ${a.fullName}?`}
              className="inline-flex items-center text-danger hover:text-danger align-middle"
            >
              <Trash2 size={15} aria-hidden="true" />
              <span className="sr-only">Delete {a.fullName}</span>
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
          <h1 className="font-display font-bold text-2xl text-primary-950">Alumni</h1>
          <p className="text-sm text-slate mt-1">{alumni.length} alumni account{alumni.length === 1 ? "" : "s"}</p>
        </div>
        <a
          href={`/api/admin/alumni/export?${exportParams.toString()}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3.5 py-2 text-sm font-semibold text-primary-800 hover:border-primary-600 hover:text-accent-600"
        >
          <FileDown size={15} /> Export PDF
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatTile icon={Users} label="Total Alumni" value={alumni.length} />
        <StatTile icon={UserCheck} label="Active" value={activeCount} />
        <StatTile icon={Heart} label="Willing to Mentor" value={mentorCount} />
      </div>

      <FilterBar>
        <FilterSearch id="alumni-q" label="Search alumni" defaultValue={q} placeholder="Name, email, programme…" />
        <FilterField id="alumni-sort" label="Order">
          <select id="alumni-sort" name="sort" defaultValue={sort ?? "joined"} className={filterControlClasses}>
            {ALUMNI_SORT_FIELDS.map((field) => (
              <option key={field} value={field}>{SORT_LABELS[field]}</option>
            ))}
          </select>
        </FilterField>
        <FilterActions clearHref="/admin/alumni" />
      </FilterBar>

      {alumni.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={28} />}
          title="No alumni accounts yet"
          description="Alumni appear here once they self-register, or once a member is marked as graduated."
        />
      ) : (
        <DataTable caption="Alumni accounts" rows={alumni} rowKey={(a) => a.id} columns={columns} />
      )}
    </div>
  );
}
