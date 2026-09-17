import { BarChart3, GraduationCap, HeartHandshake, Search, ShieldCheck, TrendingUp, UserRound, Users } from "lucide-react";
import { requirePatron } from "@/lib/auth/patron";
import {
  getDirectoryFilterOptions,
  getLevelDistribution,
  getMembershipGrowth,
  getMembershipOverview,
  getMentorshipSummary,
  listAlumniForPatrons,
} from "@/lib/services/patron-insights-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { Pagination, inputClasses } from "@/components/ui/Common";
import { StatTile } from "@/components/patron-portal/Display";
import { LineChart } from "@/components/charts/LineChart";
import { BarList } from "@/components/charts/BarList";

export const metadata = { title: "Membership Network" };
export const dynamic = "force-dynamic";

const count = new Intl.NumberFormat("en-GH");

export default async function PatronMembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; year?: string; industry?: string; mentors?: string; page?: string }>;
}) {
  await requirePatron();
  const params = await searchParams;
  const graduationYear = Number(params.year) || undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const mentorsOnly = params.mentors === "1";

  const [overview, growth, levels, mentorship, directory, options] = await Promise.all([
    getMembershipOverview(),
    getMembershipGrowth(6),
    getLevelDistribution(),
    getMentorshipSummary(),
    listAlumniForPatrons({ q: params.q, graduationYear, industry: params.industry, mentorsOnly, page }),
    getDirectoryFilterOptions(),
  ]);

  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (graduationYear) query.set("year", String(graduationYear));
  if (params.industry) query.set("industry", params.industry);
  if (mentorsOnly) query.set("mentors", "1");
  const basePath = `/patrons/dashboard/membership?${query.toString()}`;

  // Everyone on the membership roll, the same figure the association's own
  // Members list shows. A person who is both a student and an alumnus is in
  // both counts, so the total subtracts them once.
  const students = overview.students;
  const alumniOnly = overview.alumni - overview.dualMembers;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Membership Network"
        description="Who makes up the association, shown as totals only. No student's personal or health details are shared here. Students are counted exactly as the association's own membership roll counts them."
      />

      <section aria-label="Membership figures" className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Members"
          value={count.format(overview.totalMembers)}
          detail={
            overview.dualMembers > 0
              ? `${count.format(students)} students + ${count.format(overview.alumni)} alumni − ${count.format(
                  overview.dualMembers,
                )} counted twice`
              : `${count.format(students)} students + ${count.format(overview.alumni)} alumni`
          }
          icon={<Users size={18} />}
        />
        <StatTile
          label="Enrolled Students"
          value={count.format(students)}
          detail={
            students === overview.activeStudents
              ? "On the membership roll"
              : `${count.format(overview.activeStudents)} active, the rest suspended`
          }
          icon={<TrendingUp size={18} />}
        />
        <StatTile
          label="Alumni"
          value={count.format(overview.alumni)}
          detail={overview.dualMembers > 0 ? `${count.format(overview.dualMembers)} also studying again` : undefined}
          icon={<GraduationCap size={18} />}
        />
        <StatTile label="Alumni Mentors" value={count.format(overview.mentors)} icon={<HeartHandshake size={18} />} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard id="growth" title="Membership Growth" icon={<TrendingUp size={20} />}>
          <p className="text-sm text-slate mb-3">New students by year of admission, and new alumni by graduation year.</p>
          <LineChart
            label="New students and new alumni per year"
            categories={growth.map((g) => String(g.year))}
            series={[
              { key: "students", label: "Students", color: "var(--viz-students)", values: growth.map((g) => g.students) },
              { key: "alumni", label: "Alumni", color: "var(--viz-alumni)", values: growth.map((g) => g.alumni) },
            ]}
            formatValue={(n) => count.format(n)}
            minWidth={460}
          />
        </DashboardCard>

        <DashboardCard id="levels" title="Students by Level" icon={<BarChart3 size={20} />}>
          <p className="text-sm text-slate mb-4">Currently enrolled students, by year of study.</p>
          <BarList
            label="Enrolled students by level"
            rows={levels.map((l) => ({ key: l.label, label: l.label, value: l.count }))}
            color="var(--viz-students)"
            formatValue={(n) => count.format(n)}
          />
        </DashboardCard>

        <DashboardCard id="representation" title="Representation" icon={<ShieldCheck size={20} />}>
          <p className="text-sm text-slate mb-4">How the membership is made up. Each person is counted once.</p>
          <BarList
            label="Membership by standing"
            rows={[
              { key: "students", label: "Students with special needs (enrolled)", value: students },
              { key: "alumni", label: "Alumni (not currently enrolled)", value: alumniOnly },
            ]}
            color="var(--viz-students)"
            formatValue={(n) => count.format(n)}
          />
        </DashboardCard>

        <DashboardCard id="mentorship" title="Mentorship & Engagement" icon={<HeartHandshake size={20} />}>
          <p className="text-sm text-slate mb-4">
            {count.format(mentorship.mentors)} alumni have offered to mentor students, across these fields:
          </p>
          {mentorship.byIndustry.length === 0 ? (
            <p className="text-slate">No alumni have offered mentorship yet.</p>
          ) : (
            <BarList
              label="Alumni mentors by industry"
              rows={mentorship.byIndustry.slice(0, 8).map((m) => ({ key: m.industry, label: m.industry, value: m.count }))}
              color="var(--viz-alumni)"
              formatValue={(n) => count.format(n)}
              showShare={false}
            />
          )}
        </DashboardCard>
      </div>

      <section id="directory" aria-labelledby="directory-heading" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6 scroll-mt-24">
        <h2 id="directory-heading" className="font-display font-bold text-xl text-primary-950">
          Alumni Network Directory
        </h2>
        <p className="text-sm text-slate mt-1 mb-5">
          Alumni who chose to be listed in the directory, for career mentorship and connections. Contact details
          aren&apos;t shown — ask the executive team to make an introduction.
        </p>

        <form role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto_auto] items-end mb-5">
          <div>
            <label htmlFor="dir-q" className="block text-sm font-medium text-primary-950 mb-1.5">
              Name, programme or field
            </label>
            <input id="dir-q" name="q" type="search" defaultValue={params.q} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="dir-year" className="block text-sm font-medium text-primary-950 mb-1.5">
              Graduation year
            </label>
            <select id="dir-year" name="year" defaultValue={graduationYear ? String(graduationYear) : ""} className={inputClasses}>
              <option value="">Any year</option>
              {options.years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dir-industry" className="block text-sm font-medium text-primary-950 mb-1.5">
              Industry
            </label>
            <select id="dir-industry" name="industry" defaultValue={params.industry ?? ""} className={inputClasses}>
              <option value="">Any industry</option>
              {options.industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink min-h-11">
            <input type="checkbox" name="mentors" value="1" defaultChecked={mentorsOnly} className="h-4 w-4 rounded border-line" />
            Mentors only
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-800 px-4 py-2.5 min-h-11 text-sm font-semibold text-white hover:bg-primary-900"
          >
            <Search size={16} aria-hidden="true" /> Search
          </button>
        </form>

        <p className="text-sm text-slate mb-3" role="status">
          {count.format(directory.total)} alumn{directory.total === 1 ? "us" : "i"} found
        </p>
        {directory.items.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {directory.items.map((alumnus) => (
              <li key={alumnus.id} className="flex gap-3 rounded-lg border border-line p-3">
                <span className="w-12 h-12 rounded-full overflow-hidden bg-surface-muted border border-line flex items-center justify-center shrink-0 text-slate-light">
                  {alumnus.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={alumnus.profileImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserRound size={22} aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-primary-950">{alumnus.fullName}</p>
                  <p className="text-sm text-slate">
                    Class of {alumnus.graduationYear} · {alumnus.programme}
                  </p>
                  {(alumnus.currentPosition || alumnus.currentOrganization || alumnus.profession) && (
                    <p className="text-sm text-ink">
                      {[alumnus.currentPosition ?? alumnus.profession, alumnus.currentOrganization].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-slate mt-0.5">
                    {[alumnus.industry, alumnus.currentLocation].filter(Boolean).join(" · ")}
                  </p>
                  {alumnus.willingToMentor && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-success">
                      <HeartHandshake size={13} aria-hidden="true" /> Open to mentoring
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination currentPage={directory.page} totalPages={directory.totalPages} basePath={basePath} />
      </section>
    </div>
  );
}
