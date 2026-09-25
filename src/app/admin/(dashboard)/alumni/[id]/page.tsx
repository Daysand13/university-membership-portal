import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ClipboardList, GraduationCap, HandHeart, Star, UserRound, UsersRound } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getAlumniStudyRecords } from "@/lib/services/alumni-service";
import { listPriorProgrammes } from "@/lib/services/alumni-prior-programme-service";
import { getMentorMetrics } from "@/lib/services/mentorship-service";
import { getGivingSummary } from "@/lib/services/alumni-giving-service";
import { formatCedis } from "@/lib/patron-portal-options";
import { PaidDocumentsPanel } from "@/components/admin/PaidDocumentsPanel";

export const metadata = { title: "Alumni Record" };
export const dynamic = "force-dynamic";

const TRACK_LABEL: Record<string, string> = { UNDERGRADUATE: "Undergraduate", POSTGRADUATE: "Postgraduate" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate">{label}</dt>
      <dd className="font-semibold text-primary-950 break-words">{value || "—"}</dd>
    </div>
  );
}

/**
 * One graduate, as the association holds them: who they are, what they
 * studied — including undergraduate programmes they added themselves — and
 * what they've put back in.
 */
export default async function AdminAlumniRecordPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("members.alumni");
  const { id } = await params;
  const alumni = await db.alumniProfile.findUnique({ where: { id } });
  if (!alumni) notFound();

  const [{ records }, prior, mentoring, giving] = await Promise.all([
    getAlumniStudyRecords(alumni),
    listPriorProgrammes(alumni.id),
    getMentorMetrics(alumni.id),
    getGivingSummary(alumni.id),
  ]);

  return (
    <div className="max-w-5xl">
      <Link href="/admin/alumni" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Alumni
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">{alumni.fullName}</h1>
          <p className="text-sm text-slate mt-1">
            Class of {alumni.graduationYear} · {alumni.programme} · {alumni.status === "ACTIVE" ? "Active" : "Suspended"}
          </p>
        </div>
        <Link
          href={`/admin/alumni/${alumni.id}/feature`}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-primary-950 hover:bg-surface-muted"
        >
          <Star size={14} aria-hidden="true" /> Spotlight
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-4">
            <UserRound size={18} aria-hidden="true" /> Contact &amp; career
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Row label="Email" value={<a href={`mailto:${alumni.email}`} className="hover:text-accent-600">{alumni.email}</a>} />
            <Row label="Phone" value={alumni.phone} />
            <Row label="Profession" value={alumni.profession} />
            <Row label="Location" value={alumni.currentLocation} />
            <Row
              label="Current role"
              value={[alumni.currentPosition, alumni.currentOrganization].filter(Boolean).join(" at ")}
            />
            <Row label="Directory" value={alumni.directoryVisible ? "Visible to alumni" : "Hidden"} />
          </dl>
        </section>

        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-4">
            <HandHeart size={18} aria-hidden="true" /> What they&apos;ve put in
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Row label="Mentoring" value={alumni.willingToMentor ? `Available · up to ${alumni.mentorCapacity}` : "Not offering"} />
            <Row label="Students guiding now" value={String(mentoring.activeMentees)} />
            <Row label="Sessions completed" value={String(mentoring.sessionsCompleted)} />
            <Row label="Lifetime giving" value={formatCedis(giving.lifetimePesewas)} />
          </dl>
        </section>

        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-4">
            <ClipboardList size={18} aria-hidden="true" /> Study on record
          </h2>
          {records.length === 0 ? (
            <p className="text-sm text-slate">No enrollment with the association is linked to this account.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {records.map((record) => (
                <li key={record.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="font-semibold text-primary-950">{record.programme}</p>
                  <p className="text-slate">
                    {record.track ? `${TRACK_LABEL[record.track]} · ` : ""}
                    <span className="font-data">{record.indexNumber}</span> · admitted {record.yearOfAdmission}
                    {record.graduatedAt ? " · completed" : " · in progress"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-1">
            <GraduationCap size={18} aria-hidden="true" /> Undergraduate programmes
          </h2>
          <p className="text-xs text-slate mb-4">Added by the graduate themselves; not verified by the association.</p>
          {prior.length === 0 ? (
            <p className="text-sm text-slate">None added.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {prior.map((p) => (
                <li key={p.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="font-semibold text-primary-950">{p.programme}</p>
                  <p className="text-slate">
                    {p.qualification} · {p.institution}
                    {p.yearCompleted && ` · ${p.yearCompleted}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6">
        <PaidDocumentsPanel
          owner={{ kind: "alumni", id: alumni.id, email: alumni.email }}
          name={alumni.fullName}
        />
      </div>

      {mentoring.totalMentees > 0 && (
        <p className="mt-6 flex items-center gap-2 text-sm text-slate">
          <UsersRound size={15} aria-hidden="true" /> Has mentored {mentoring.totalMentees} student
          {mentoring.totalMentees === 1 ? "" : "s"} through the portal.
        </p>
      )}
    </div>
  );
}
