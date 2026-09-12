import Link from "next/link";
import { Users, Briefcase, Mail } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { listMentors } from "@/lib/services/alumni-service";
import { EmptyState } from "@/components/ui/Common";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";

export const metadata = { title: "Networking & Mentorship" };
export const dynamic = "force-dynamic";

export default async function MentorshipBoardPage() {
  const currentAlumni = await requireAlumni();
  const mentors = await listMentors();

  return (
    <>
      <PortalPageHeader
        title="Networking & Mentorship"
        description="Alumni who have made themselves available to mentor current students and fellow graduates."
      />

      {!currentAlumni.willingToMentor && (
        <div className="mb-6 rounded-lg border border-accent-400 bg-accent-50 p-4 text-[15px] text-primary-950">
          Want to appear here yourself?{" "}
          <Link href="/alumni/profile" className="font-semibold underline hover:text-accent-700">
            Turn on &quot;Willing to Mentor&quot; in your account settings
          </Link>
          .
        </div>
      )}

      {mentors.length === 0 ? (
        <EmptyState icon={<Users size={28} aria-hidden="true" />} title="No mentors listed yet" description="Check back soon." />
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {mentors.map((m) => (
            <li key={m.id} className="bg-white rounded-xl border border-line shadow-card p-5">
              <p className="font-display font-bold text-base text-primary-950 break-words">{m.fullName}</p>
              <p className="text-sm text-slate">
                {m.programme} · Class of {m.graduationYear}
              </p>
              {m.profession && (
                <p className="text-sm text-slate mt-1.5 flex items-center gap-1.5">
                  <Briefcase size={13} className="shrink-0" aria-hidden="true" /> {m.profession}
                </p>
              )}
              {m.bio && <p className="text-sm text-slate mt-2 leading-relaxed">{m.bio}</p>}
              <a
                href={`mailto:${m.email}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600 py-1"
              >
                <Mail size={14} aria-hidden="true" /> Get in touch<span className="sr-only"> with {m.fullName}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
