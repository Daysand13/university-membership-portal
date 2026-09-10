import Link from "next/link";
import { GraduationCap, Trash2, FileDown, Users, UserCheck, Heart, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/Common";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { listAlumniForAdmin, ALUMNI_SORT_FIELDS, describeAlumniSource, type AlumniSortField } from "@/lib/services/alumni-service";
import { setAlumniStatusAction, deleteAlumniAction } from "@/lib/actions/alumni-actions";
import { getCurrentAdmin } from "@/lib/auth/admin";

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

      <form className="mb-6 flex flex-wrap gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, programme…"
          className="flex-1 min-w-[200px] max-w-md rounded-md border border-line bg-white px-3.5 py-2 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
        />
        <select
          name="sort"
          defaultValue={sort ?? "joined"}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
        >
          {ALUMNI_SORT_FIELDS.map((field) => (
            <option key={field} value={field}>{SORT_LABELS[field]}</option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-primary-800 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-900">
          Apply
        </button>
      </form>

      {alumni.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={28} />}
          title="No alumni accounts yet"
          description="Alumni appear here once they self-register, or once a member is marked as graduated."
        />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Programme</th>
                <th className="text-left px-5 py-3 font-semibold">Class of</th>
                <th className="text-left px-5 py-3 font-semibold">Source</th>
                <th className="text-left px-5 py-3 font-semibold">Public site</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {alumni.map((a) => (
                <tr key={a.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-primary-950">{a.fullName}</p>
                    <p className="text-xs text-slate-light">{a.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{a.programme}</td>
                  <td className="px-5 py-3.5 text-slate">{a.graduationYear}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-light">
                    {
                      { "graduated-member": "Graduated member", "currently-enrolled": "Currently a member too", "self-registered": "Self-registered" }[
                        describeAlumniSource(a)
                      ]
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    {/* Three distinct states, not two: private, public, and
                        public-and-featured. Showing them apart here is what
                        stops "public" and "featured" being conflated. */}
                    {a.spotlight?.published ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 bg-accent-100 text-accent-700">
                        <Star size={11} /> Featured
                      </span>
                    ) : a.publicProfile ? (
                      <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-primary-50 text-primary-800">
                        Public
                      </span>
                    ) : (
                      <span className="text-xs text-slate-light">Private</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <form action={setAlumniStatusAction.bind(null, a.id, a.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>
                      <button
                        type="submit"
                        className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
                          a.status === "ACTIVE" ? "bg-success-light text-success" : "bg-danger-light text-danger"
                        }`}
                      >
                        {a.status === "ACTIVE" ? "Active" : "Suspended"}
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-3.5 text-slate-light text-xs">{formatDate(a.createdAt)}</td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/alumni/${a.id}/feature`}
                      className="text-sm font-semibold text-primary-800 hover:text-accent-600 mr-3"
                    >
                      {a.spotlight ? "Edit spotlight" : "Feature"}
                    </Link>
                    {canDelete && (
                      <ConfirmButton
                        action={deleteAlumniAction.bind(null, a.id)}
                        confirmMessage={`Permanently delete the alumni account for ${a.fullName}?`}
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
