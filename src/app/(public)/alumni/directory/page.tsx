import Link from "next/link";
import { User, ArrowLeft, MapPin, Briefcase } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { searchAlumniDirectory } from "@/lib/services/alumni-service";
import { EmptyState } from "@/components/ui/Common";

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
    <div className="bg-surface-muted min-h-[70vh]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/alumni/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-primary-800 mb-4">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">Alumni Directory</h1>
        <p className="text-sm text-slate mb-6">Search for fellow graduates by name, programme, profession, or location.</p>

        <form className="mb-6">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search the directory…"
            className="w-full rounded-md border border-line bg-white px-4 py-2.5 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
          />
        </form>

        {alumni.length === 0 ? (
          <EmptyState icon={<User size={28} />} title="No alumni found" description="Try a different search term." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {alumni.map((a) => (
              <div key={a.id} className="bg-white rounded-lg border border-line p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-50 border border-line overflow-hidden flex items-center justify-center text-primary-300 shrink-0">
                  {a.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.profileImageUrl} alt={a.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-primary-950 truncate">{a.fullName}</p>
                  <p className="text-xs text-slate-light">{a.programme} · Class of {a.graduationYear}</p>
                  {a.profession && (
                    <p className="text-xs text-slate mt-1.5 flex items-center gap-1">
                      <Briefcase size={11} className="shrink-0" /> {a.profession}
                    </p>
                  )}
                  {a.currentLocation && (
                    <p className="text-xs text-slate mt-0.5 flex items-center gap-1">
                      <MapPin size={11} className="shrink-0" /> {a.currentLocation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
