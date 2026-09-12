import { User, MapPin, Briefcase } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { searchAlumniDirectory } from "@/lib/services/alumni-service";
import { EmptyState } from "@/components/ui/Common";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";

export const metadata = { title: "Alumni Directory" };
export const dynamic = "force-dynamic";

export default async function AlumniDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAlumni();
  const { q } = await searchParams;
  const alumni = await searchAlumniDirectory(q);

  return (
    <>
      <PortalPageHeader
        title="Alumni Directory"
        description="Search for fellow graduates by name, programme, profession, or location."
      />

      <form role="search" className="mb-6">
        <label htmlFor="directory-search" className="sr-only">
          Search the alumni directory
        </label>
        <input
          id="directory-search"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search the directory…"
          className="w-full rounded-lg border border-line bg-white px-4 py-3 text-[15px] focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
        />
      </form>

      {alumni.length === 0 ? (
        <EmptyState icon={<User size={28} aria-hidden="true" />} title="No alumni found" description="Try a different search term." />
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {alumni.map((a) => (
            <li key={a.id} className="bg-white rounded-xl border border-line shadow-card p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-50 border border-line overflow-hidden flex items-center justify-center text-primary-300 shrink-0">
                {a.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.profileImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-base text-primary-950 break-words">{a.fullName}</p>
                <p className="text-sm text-slate">
                  {a.programme} · Class of {a.graduationYear}
                </p>
                {a.profession && (
                  <p className="text-sm text-slate mt-1.5 flex items-center gap-1.5">
                    <Briefcase size={13} className="shrink-0" aria-hidden="true" /> {a.profession}
                  </p>
                )}
                {a.currentLocation && (
                  <p className="text-sm text-slate mt-0.5 flex items-center gap-1.5">
                    <MapPin size={13} className="shrink-0" aria-hidden="true" /> {a.currentLocation}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
