import "server-only";
import { db } from "@/lib/db";
import type {
  AdminRole,
  AlumniProfile,
  BarrierReportStatus,
  Member,
  MentorshipSender,
  NotificationType,
} from "@/generated/prisma/client";
import { deliver, firstNameOf } from "@/lib/services/account-notification-service";
import type { EmailBrand, NoticeDetail } from "@/lib/email/templates";
import { formatCedis, issueCategoryLabel } from "@/lib/patron-portal-options";
import { barrierStatusLabel, supportRequestTypeLabel, supportStatusLabel } from "@/lib/portal-options";

/**
 * Emails (and admin bell notifications) for the Student and Alumni portals:
 * barrier reports and how they progress, requests for support and what was
 * decided, mentorship, and the opportunity board.
 *
 * Best-effort, like every account notice in this project: each runs after
 * the change is already saved, and never throws. A student's report is
 * filed whether or not the email goes out.
 */

const dateTimeFormat = new Intl.DateTimeFormat("en-GH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

// The same wording as account notices: these emails come from a no-reply address.
const CONTACT_LINE = "If you have any questions about this, please contact the association through the Contact page on our website.";

function excerpt(text: string, max = 400): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

type StudentRecipient = Pick<Member, "id" | "firstName" | "email">;

/** Puts an item in the admin bell and emails the admins who handle it. */
export async function notifyAdmins(params: {
  roles: AdminRole[];
  template: string;
  entityType: string;
  entityId: string;
  bell: { type: NotificationType; title: string; body?: string; link: string };
  build: (brand: EmailBrand) => {
    subject: string;
    paragraphs: string[];
    details?: NoticeDetail[];
    closingParagraphs?: string[];
    cta?: { path: string; label: string };
  };
}): Promise<void> {
  const { roles, template, entityType, entityId, bell, build } = params;
  try {
    await db.notification.create({
      data: { type: bell.type, title: bell.title, body: bell.body ?? null, link: bell.link },
    });
  } catch (err) {
    console.error(`[portal-notification] could not add the "${template}" bell notification`, err);
  }

  let admins: { email: string; name: string }[];
  try {
    admins = await db.adminUser.findMany({
      where: { isActive: true, role: { in: ["SUPER_ADMIN", ...roles] } },
      select: { email: true, name: true },
      take: 10,
    });
  } catch (err) {
    console.error(`[portal-notification] could not look up admins for "${template}"`, err);
    return;
  }

  await Promise.all(
    admins.map((admin) =>
      deliver({ to: { email: admin.email, firstName: firstNameOf(admin.name) }, template, entityType, entityId, build }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Barrier reports
// ---------------------------------------------------------------------------

export async function notifyAdminsOfBarrierReport(params: {
  report: { id: string; title: string; category: string; location: string | null; description: string };
  member: Pick<Member, "firstName" | "lastName" | "indexNumber">;
}): Promise<void> {
  const { report, member } = params;
  const student = `${member.firstName} ${member.lastName} (${member.indexNumber})`;
  await notifyAdmins({
    roles: ["MEMBERSHIP_OFFICER"],
    template: "admin-barrier-report",
    entityType: "BarrierReport",
    entityId: report.id,
    bell: {
      type: "SYSTEM",
      title: `Accessibility barrier reported: ${report.title}`,
      body: `From ${student}`,
      link: `/admin/advocacy/${report.id}`,
    },
    build: () => ({
      subject: `Accessibility barrier reported: ${report.title}`,
      paragraphs: ["A student has reported a barrier on campus through the Student Portal."],
      details: [
        { label: "Student", value: student },
        { label: "About", value: issueCategoryLabel(report.category) },
        ...(report.location ? [{ label: "Where", value: report.location }] : []),
        { label: "What happened", value: excerpt(report.description) },
      ],
      cta: { path: `/admin/advocacy/${report.id}`, label: "Open the Report" },
    }),
  });
}

export async function notifyStudentOfReportUpdate(params: {
  report: { id: string; title: string };
  member: StudentRecipient;
  status: BarrierReportStatus;
  note: string;
}): Promise<void> {
  const { report, member, status, note } = params;
  const resolved = status === "RESOLVED";
  await deliver({
    to: { email: member.email, firstName: member.firstName },
    template: "student-barrier-report-update",
    entityType: "BarrierReport",
    entityId: report.id,
    build: () => ({
      subject: resolved ? `Resolved: ${report.title}` : `Update on your report: ${report.title}`,
      paragraphs: [
        resolved
          ? "Your report has been marked as resolved. Thank you for telling us — reports like yours are what get things changed."
          : "There's an update on the barrier you reported.",
      ],
      details: [
        { label: "Your report", value: report.title },
        { label: "Status", value: barrierStatusLabel(status) },
        { label: "Update", value: excerpt(note, 600) },
      ],
      closingParagraphs: [
        status === "ESCALATED"
          ? "Escalated means the executives have put this to the association's patrons for intervention. Your name and anything you attached stay with the executives."
          : CONTACT_LINE,
      ],
      cta: { path: `/membership/dashboard/rights/${report.id}`, label: "See the Full Tracker" },
    }),
  });
}

// ---------------------------------------------------------------------------
// Support requests
// ---------------------------------------------------------------------------

export async function notifyAdminsOfSupportRequest(params: {
  request: { id: string; type: string; details: string; amountRequestedPesewas: number | null };
  member: Pick<Member, "firstName" | "lastName" | "indexNumber" | "level">;
}): Promise<void> {
  const { request, member } = params;
  const student = `${member.firstName} ${member.lastName} (${member.indexNumber}, Level ${member.level})`;
  await notifyAdmins({
    roles: ["MEMBERSHIP_OFFICER"],
    template: "admin-support-request",
    entityType: "SupportRequest",
    entityId: request.id,
    bell: {
      type: "SYSTEM",
      title: `Support request: ${supportRequestTypeLabel(request.type)}`,
      body: `From ${student}`,
      link: `/admin/support-requests/${request.id}`,
    },
    build: () => ({
      subject: `Support request from ${member.firstName} ${member.lastName}`,
      paragraphs: ["A student has asked the association for assistance."],
      details: [
        { label: "Student", value: student },
        { label: "Asking for", value: supportRequestTypeLabel(request.type) },
        ...(request.amountRequestedPesewas
          ? [{ label: "Amount", value: formatCedis(request.amountRequestedPesewas) }]
          : []),
        { label: "Details", value: excerpt(request.details) },
      ],
      cta: { path: `/admin/support-requests/${request.id}`, label: "Review the Request" },
    }),
  });
}

export async function notifyStudentOfSupportDecision(params: {
  request: {
    id: string;
    type: string;
    status: string;
    reviewNote: string | null;
    approvedAmountPesewas: number | null;
  };
  member: StudentRecipient;
}): Promise<void> {
  const { request, member } = params;
  const approved = request.status === "APPROVED";
  const fulfilled = request.status === "FULFILLED";
  await deliver({
    to: { email: member.email, firstName: member.firstName },
    template: `student-support-${request.status.toLowerCase()}`,
    entityType: "SupportRequest",
    entityId: request.id,
    build: () => ({
      subject: fulfilled
        ? `Your support request has been provided for`
        : approved
          ? `Your support request has been approved`
          : `About your support request`,
      paragraphs: [
        fulfilled
          ? "The support you asked for has now been provided. If anything is missing, tell us and we'll put it right."
          : approved
            ? "Good news — the executives have approved your request. They'll be in touch about arranging it."
            : "The executives have looked at your request. It hasn't been approved this time.",
      ],
      details: [
        { label: "You asked for", value: supportRequestTypeLabel(request.type) },
        { label: "Status", value: supportStatusLabel(request.status) },
        ...(request.approvedAmountPesewas
          ? [{ label: "Approved", value: formatCedis(request.approvedAmountPesewas) }]
          : []),
        ...(request.reviewNote ? [{ label: "Note", value: excerpt(request.reviewNote, 600) }] : []),
      ],
      closingParagraphs: [CONTACT_LINE],
      cta: { path: "/membership/dashboard/support", label: "Open Your Requests" },
    }),
  });
}

// ---------------------------------------------------------------------------
// Mentorship
// ---------------------------------------------------------------------------

export async function notifyMentorOfRequest(params: {
  mentor: Pick<AlumniProfile, "id" | "fullName" | "email">;
  member: Pick<Member, "firstName" | "lastName" | "level" | "programme">;
  requestNote: string;
}): Promise<void> {
  const { mentor, member, requestNote } = params;
  await deliver({
    to: { email: mentor.email, firstName: firstNameOf(mentor.fullName) },
    template: "alumni-mentorship-request",
    entityType: "AlumniProfile",
    entityId: mentor.id,
    build: () => ({
      subject: "A student has asked you to mentor them",
      paragraphs: [
        `${member.firstName} ${member.lastName}, a Level ${member.level} student, has asked you to be their mentor.`,
        "You can accept or decline in the Alumni Portal. Declining is perfectly fine — a short reason helps them ask someone else.",
      ],
      details: [
        { label: "Student", value: `${member.firstName} ${member.lastName}` },
        { label: "Studying", value: `${member.programme}, Level ${member.level}` },
        { label: "They wrote", value: excerpt(requestNote, 600) },
      ],
      cta: { path: "/alumni/mentorship", label: "Open the Mentorship Centre" },
    }),
  });
}

export async function notifyMentorshipDecision(params: {
  member: StudentRecipient;
  mentor: Pick<AlumniProfile, "fullName" | "profession">;
  accepted: boolean;
  reason: string | null;
}): Promise<void> {
  const { member, mentor, accepted, reason } = params;
  await deliver({
    to: { email: member.email, firstName: member.firstName },
    template: accepted ? "student-mentorship-accepted" : "student-mentorship-declined",
    entityType: "Member",
    entityId: member.id,
    build: () => ({
      subject: accepted ? `${mentor.fullName} is now your mentor` : "About your mentorship request",
      paragraphs: [
        accepted
          ? `${mentor.fullName} has agreed to mentor you. You can message them and book a session from your portal — no email address changes hands either way.`
          : `${mentor.fullName} isn't able to take this on at the moment. Other graduates are offering to mentor, and you can ask any of them.`,
      ],
      details: reason ? [{ label: "They said", value: excerpt(reason, 400) }] : undefined,
      cta: { path: "/membership/dashboard/mentorship", label: "Open Mentorship" },
    }),
  });
}

export async function notifyOfMentorshipMessage(params: {
  mentorship: { id: string };
  member: StudentRecipient & Pick<Member, "lastName">;
  mentor: Pick<AlumniProfile, "fullName" | "email">;
  sender: MentorshipSender;
  body: string;
}): Promise<void> {
  const { mentorship, member, mentor, sender, body } = params;
  const toStudent = sender === "MENTOR";
  await deliver({
    to: toStudent
      ? { email: member.email, firstName: member.firstName }
      : { email: mentor.email, firstName: firstNameOf(mentor.fullName) },
    template: "mentorship-message",
    entityType: "Mentorship",
    entityId: mentorship.id,
    build: () => ({
      subject: toStudent ? `${mentor.fullName} replied` : `${member.firstName} ${member.lastName} wrote to you`,
      paragraphs: ["You have a new message in your mentorship conversation."],
      details: [{ label: "Message", value: excerpt(body, 600) }],
      cta: {
        path: toStudent ? `/membership/dashboard/mentorship/${mentorship.id}` : `/alumni/mentorship/${mentorship.id}`,
        label: "Open the Conversation",
      },
    }),
  });
}

export async function notifyOfMentorshipSession(params: {
  member: StudentRecipient & Pick<Member, "lastName">;
  mentor: Pick<AlumniProfile, "fullName" | "email">;
  session: { id: string; scheduledFor: Date; topic: string | null };
  bookedByStudent: boolean;
  cancelled: boolean;
}): Promise<void> {
  const { member, mentor, session, bookedByStudent, cancelled } = params;
  // Whoever didn't do it is the one who needs to hear about it.
  const toStudent = !bookedByStudent;
  const when = dateTimeFormat.format(session.scheduledFor);
  await deliver({
    to: toStudent
      ? { email: member.email, firstName: member.firstName }
      : { email: mentor.email, firstName: firstNameOf(mentor.fullName) },
    template: cancelled ? "mentorship-session-cancelled" : "mentorship-session-booked",
    entityType: "MentorshipSession",
    entityId: session.id,
    build: () => ({
      subject: cancelled ? `Mentorship session cancelled — ${when}` : `Mentorship session booked — ${when}`,
      paragraphs: [
        cancelled
          ? "A mentorship session has been cancelled. You can arrange another one from the portal whenever it suits you both."
          : `A mentorship session has been arranged with ${toStudent ? mentor.fullName : `${member.firstName} ${member.lastName}`}.`,
      ],
      details: [
        { label: "When", value: when },
        ...(session.topic ? [{ label: "About", value: session.topic }] : []),
      ],
      cta: { path: toStudent ? "/membership/dashboard/mentorship" : "/alumni/mentorship", label: "Open Mentorship" },
    }),
  });
}

// ---------------------------------------------------------------------------
// The opportunity board
// ---------------------------------------------------------------------------

export async function notifyAdminsOfOpportunity(params: {
  opportunity: { id: string; title: string; organization: string; type: string };
  alumni: Pick<AlumniProfile, "fullName">;
}): Promise<void> {
  const { opportunity, alumni } = params;
  await notifyAdmins({
    roles: ["MEMBERSHIP_OFFICER", "EDITOR"],
    template: "admin-opportunity-pending",
    entityType: "Opportunity",
    entityId: opportunity.id,
    bell: {
      type: "SYSTEM",
      title: `Opportunity awaiting approval: ${opportunity.title}`,
      body: `Posted by ${alumni.fullName}`,
      link: `/admin/opportunities/${opportunity.id}`,
    },
    build: () => ({
      subject: `Opportunity awaiting approval: ${opportunity.title}`,
      paragraphs: [
        "An alumnus has posted an opening for students and fellow graduates. It stays hidden until an administrator approves it.",
      ],
      details: [
        { label: "Posted by", value: alumni.fullName },
        { label: "Role", value: opportunity.title },
        { label: "With", value: opportunity.organization },
      ],
      cta: { path: `/admin/opportunities/${opportunity.id}`, label: "Review the Posting" },
    }),
  });
}

export async function notifyAlumniOfOpportunityDecision(params: {
  alumni: Pick<AlumniProfile, "id" | "fullName" | "email">;
  opportunity: { id: string; title: string };
  approved: boolean;
  note: string | null;
}): Promise<void> {
  const { alumni, opportunity, approved, note } = params;
  await deliver({
    to: { email: alumni.email, firstName: firstNameOf(alumni.fullName) },
    template: approved ? "alumni-opportunity-approved" : "alumni-opportunity-rejected",
    entityType: "Opportunity",
    entityId: opportunity.id,
    build: () => ({
      subject: approved ? `Your posting is live: ${opportunity.title}` : `Your posting wasn't published`,
      paragraphs: [
        approved
          ? "Thank you — your posting is now on the opportunity board where students and fellow graduates can see it."
          : "An administrator has reviewed your posting and it hasn't been published.",
      ],
      details: note ? [{ label: "Note", value: excerpt(note, 500) }] : undefined,
      closingParagraphs: [CONTACT_LINE],
      cta: { path: "/alumni/opportunities", label: "Open the Opportunity Board" },
    }),
  });
}

// ---------------------------------------------------------------------------
// Advocacy: an alumnus co-signing a campaign
// ---------------------------------------------------------------------------

export async function notifyAdminsOfAlumniEndorsement(params: {
  campaign: { id: string; title: string };
  alumni: Pick<AlumniProfile, "fullName" | "graduationYear">;
  comment: string | null;
}): Promise<void> {
  const { campaign, alumni, comment } = params;
  await notifyAdmins({
    roles: ["MEMBERSHIP_OFFICER"],
    template: "admin-alumni-endorsement",
    entityType: "AdvocacyCampaign",
    entityId: campaign.id,
    bell: {
      type: "SYSTEM",
      title: `${alumni.fullName} co-signed "${campaign.title}"`,
      body: `Class of ${alumni.graduationYear}`,
      link: `/admin/patrons/advocacy/campaigns/${campaign.id}`,
    },
    build: () => ({
      subject: `An alumnus has co-signed "${campaign.title}"`,
      paragraphs: [`${alumni.fullName} (Class of ${alumni.graduationYear}) has added their name to this campaign.`],
      details: comment ? [{ label: "They wrote", value: excerpt(comment, 500) }] : undefined,
      cta: { path: `/admin/patrons/advocacy/campaigns/${campaign.id}`, label: "Open the Campaign" },
    }),
  });
}
