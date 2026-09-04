import Link from "next/link";
import { Users, ArrowLeft, Briefcase, Mail } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { listMentors } from "@/lib/services/alumni-service";
import { EmptyState } from "@/components/ui/Common";

export const metadata = { title: "Mentorship Board" };
export const dynamic = "force-dynamic";

export default async function MentorshipBoardPage() {
  const currentAlumni = await requireAlumni();
  const mentors = await listMentors();

  return (
    <div className="bg-surface-muted min-h-[70vh]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/alumni/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-primary-800 mb-4">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">Mentorship Board</h1>
        <p className="text-sm text-slate mb-6">
          Alumni who have made themselves available to mentor current students and fellow graduates.
        </p>

        {!currentAlumni.willingToMentor && (
          <div className="mb-6 rounded-lg border border-accent-300 bg-accent-50 p-4 text-sm text-primary-950">
            Want to appear here yourself?{" "}
            <Link href="/alumni/profile" className="font-semibold underline hover:text-accent-700">
              Turn on &quot;Willing to Mentor&quot; in your profile
            </Link>
            .
          </div>
        )}

        {mentors.length === 0 ? (
          <EmptyState icon={<Users size={28} />} title="No mentors listed yet" description="Check back soon." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {mentors.map((m) => (
              <div key={m.id} className="bg-white rounded-lg border border-line p-5">
                <p className="font-display font-bold text-sm text-primary-950">{m.fullName}</p>
                <p className="text-xs text-slate-light">{m.programme} · Class of {m.graduationYear}</p>
                {m.profession && (
                  <p className="text-xs text-slate mt-1.5 flex items-center gap-1">
                    <Briefcase size={11} className="shrink-0" /> {m.profession}
                  </p>
                )}
                {m.bio && <p className="text-xs text-slate mt-2 leading-relaxed">{m.bio}</p>}
                <a
                  href={`mailto:${m.email}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-800 hover:text-accent-600"
                >
                  <Mail size={12} /> Get in touch
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
