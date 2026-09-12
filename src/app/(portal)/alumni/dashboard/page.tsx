import { requireAlumni } from "@/lib/auth/alumni";
import { AlumniDashboardView } from "@/components/portal/AlumniDashboardView";
import { alumniHasMemberStanding } from "@/lib/services/dual-status-service";
import { getAlumniNetworkCounts, getAlumniStudyRecords } from "@/lib/services/alumni-service";
import { firstNameOf } from "@/lib/services/account-notification-service";
import { getUpcomingEventsForHome } from "@/lib/services/event-service";

export const metadata = { title: "Alumni Portal" };
export const dynamic = "force-dynamic";

export default async function AlumniDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  const alumni = await requireAlumni();
  const [sp, isCurrentlyEnrolled, counts, study, events] = await Promise.all([
    searchParams,
    alumniHasMemberStanding(alumni),
    getAlumniNetworkCounts(),
    getAlumniStudyRecords(alumni),
    getUpcomingEventsForHome(2),
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
    />
  );
}
