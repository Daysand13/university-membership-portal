import { requireAlumni } from "@/lib/auth/alumni";
import { AlumniDashboardView } from "@/components/portal/AlumniDashboardView";
import { alumniHasMemberStanding } from "@/lib/services/dual-status-service";
import { getAlumniNetworkCounts, getAlumniStudyRecords } from "@/lib/services/alumni-service";
import { firstNameOf } from "@/lib/services/account-notification-service";
import { getUpcomingEventsForHome } from "@/lib/services/event-service";
import { getTeamRoleBadges } from "@/lib/services/team-role-service";
import { listAnnouncementsForAlumni } from "@/lib/services/broadcast-service";
import { getMentorMetrics } from "@/lib/services/mentorship-service";
import { getGivingSummary } from "@/lib/services/alumni-giving-service";
import { countAlumniEndorsements } from "@/lib/services/advocacy-service";
import { alumniRank } from "@/lib/portal-options";
import { formatCedis } from "@/lib/patron-portal-options";
import { getPriorProgrammeState } from "@/lib/services/alumni-prior-programme-service";
import { PriorProgrammes } from "@/components/alumni-portal/PriorProgrammes";
import { AnnouncementsCard } from "@/components/patron-portal/Display";

export const metadata = { title: "Alumni Portal" };
export const dynamic = "force-dynamic";

export default async function AlumniDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  const alumni = await requireAlumni();
  const [sp, isCurrentlyEnrolled, counts, study, events, teamRoles, announcements, mentoring, giving, endorsements, prior] =
    await Promise.all([
      searchParams,
      alumniHasMemberStanding(alumni),
      getAlumniNetworkCounts(),
      getAlumniStudyRecords(alumni),
      getUpcomingEventsForHome(2),
      getTeamRoleBadges({ memberIds: [alumni.sourceMemberId], userId: alumni.userId }),
      listAnnouncementsForAlumni(3),
      getMentorMetrics(alumni.id),
      getGivingSummary(alumni.id),
      countAlumniEndorsements(alumni.id),
      getPriorProgrammeState(alumni),
    ]);
  const latestApplication = study.furtherStudiesApplications[0] ?? null;

  return (
    <AlumniDashboardView
      alumni={{
        firstName: firstNameOf(alumni.fullName),
        fullName: alumni.fullName,
        email: alumni.email,
        graduationYear: alumni.graduationYear,
        programme: alumni.programme,
        profession: alumni.profession,
        currentLocation: alumni.currentLocation,
        currentPosition: alumni.currentPosition,
        currentOrganization: alumni.currentOrganization,
        industry: alumni.industry,
        linkedinUrl: alumni.linkedinUrl,
        websiteUrl: alumni.websiteUrl,
        willingToMentor: alumni.willingToMentor,
        directoryVisible: alumni.directoryVisible,
        profileImageUrl: alumni.profileImageUrl,
      }}
      notices={{ passwordChanged: sp.passwordChanged === "1" }}
      network={{ ...counts, events }}
      studyRecordCount={study.records.length}
      furtherStudies={
        latestApplication
          ? { status: latestApplication.status, submittedAt: latestApplication.submittedAt, programme: latestApplication.programme }
          : null
      }
      isCurrentlyEnrolled={isCurrentlyEnrolled}
      teamRoles={teamRoles}
      standing={{
        activeMentees: mentoring.activeMentees,
        pendingRequests: mentoring.pendingRequests,
        lifetimeGivingLabel: formatCedis(giving.lifetimePesewas),
        rank: alumniRank({
          activeMentees: mentoring.activeMentees,
          lifetimeGivingPesewas: giving.lifetimePesewas,
          endorsements,
        }),
      }}
      priorProgrammes={
        prior.eligible ? (
          <PriorProgrammes
            programmes={prior.programmes.map((p) => ({
              id: p.id,
              qualification: p.qualification,
              programme: p.programme,
              institution: p.institution,
              yearCompleted: p.yearCompleted,
            }))}
          setsGraduation={prior.setsGraduation}
          />
        ) : undefined
      }
      announcements={
        announcements.length > 0 ? <AnnouncementsCard announcements={announcements} href="/alumni/announcements" /> : undefined
      }
    />
  );
}
