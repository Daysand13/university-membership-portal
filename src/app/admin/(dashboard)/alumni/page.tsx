import { GraduationCap, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/Common";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { listAlumniForAdmin } from "@/lib/services/alumni-service";
import { setAlumniStatusAction, deleteAlumniAction } from "@/lib/actions/alumni-actions";
import { getCurrentAdmin } from "@/lib/auth/admin";

export const metadata = { title: "Alumni" };
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function AdminAlumniPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [alumni, currentAdmin] = await Promise.all([listAlumniForAdmin({ search: q }), getCurrentAdmin()]);
  const canDelete = currentAdmin?.role === "SUPER_ADMIN";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Alumni</h1>
        <p className="text-sm text-slate mt-1">{alumni.length} alumni account{alumni.length === 1 ? "" : "s"}</p>
      </div>

      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, programme…"
          className="w-full max-w-md rounded-md border border-line bg-white px-3.5 py-2 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
        />
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
                    {a.sourceMemberId ? "Graduated member" : "Self-registered"}
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
                  <td className="px-5 py-3.5 text-right">
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
