import "server-only";
import { db } from "@/lib/db";
import type { AdminRole, NotificationType } from "@/generated/prisma/client";
import { deliver, firstNameOf, patronDisplayName, patronSalutation } from "@/lib/services/account-notification-service";
import type { EmailBrand, NoticeDetail } from "@/lib/email/templates";
import {
  broadcastAudienceLabel,
  donationFundLabel,
  formatCedis,
  issueActionLabel,
  issueStatusLabel,
} from "@/lib/patron-portal-options";

/**
 * Emails (and admin bell notifications) for what happens in the Patrons'
 * Portal: broadcasts waiting for approval and their outcome, the executive
 * channel, endorsements and actions on escalated issues, uploaded documents
 * and donations. Best-effort like every account notice: each runs after the
 * change is saved and never throws.
 */

type PatronName = { id: string; email: string; title: string | null; fullName: string };

const PORTAL = "Patrons' Portal";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

function excerpt(text: string, max = 400): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * Puts an item in the admin bell and emails the admins who handle it
 * (super admins always, plus the given roles).
 */
async function notifyAdmins(params: {
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
    console.error(`[patron-portal-notification] could not add the "${template}" bell notification`, err);
  }

  let admins: { email: string; name: string }[];
  try {
    admins = await db.adminUser.findMany({
      where: { isActive: true, role: { in: ["SUPER_ADMIN", ...roles] } },
      select: { email: true, name: true },
      take: 10,
    });
  } catch (err) {
    console.error(`[patron-portal-notification] could not look up admins for "${template}"`, err);
    return;
  }

  await Promise.all(
    admins.map((admin) =>
      deliver({
        to: { email: admin.email, firstName: firstNameOf(admin.name) },
        template,
        entityType,
        entityId,
        build,
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Broadcasts
// ---------------------------------------------------------------------------

export async function notifyAdminsOfBroadcast(broadcast: {
  id: string;
  authorName: string;
  subject: string;
  audience: string;
}): Promise<void> {
  await notifyAdmins({
    roles: ["MEMBERSHIP_OFFICER"],
    template: "admin-patron-broadcast-pending",
    entityType: "Broadcast",
    entityId: broadcast.id,
    bell: {
      type: "SYSTEM",
      title: `Broadcast awaiting approval: ${broadcast.subject}`,
      body: `From ${broadcast.authorName} to ${broadcastAudienceLabel(broadcast.audience)}`,
      link: `/admin/patrons/broadcasts/${broadcast.id}`,
    },
    build: () => ({
      subject: `Broadcast awaiting approval: ${broadcast.subject}`,
      paragraphs: [
        "A patron has written a broadcast to members. Nothing is sent until an administrator approves it.",
      ],
      details: [
        { label: "From", value: broadcast.authorName },
        { label: "To", value: broadcastAudienceLabel(broadcast.audience) },
        { label: "Subject", value: broadcast.subject },
      ],
      cta: { path: `/admin/patrons/broadcasts/${broadcast.id}`, label: "Review the Broadcast" },
    }),
  });
}

export async function notifyPatronBroadcastDecision(params: {
  patron: PatronName;
  broadcast: { id: string; subject: string; audience: string };
  approved: boolean;
  note: string | null;
  recipientCount?: number;
}): Promise<void> {
  const { patron, broadcast, approved, note, recipientCount } = params;
  await deliver({
    to: { email: patron.email, firstName: patronSalutation(patron) },
    template: approved ? "patron-broadcast-approved" : "patron-broadcast-rejected",
    entityType: "Broadcast",
    entityId: broadcast.id,
    build: () => ({
      subject: approved ? `Your broadcast has been sent: ${broadcast.subject}` : `Your broadcast wasn't approved: ${broadcast.subject}`,
      paragraphs: [
        approved
          ? `Your broadcast was approved and has been sent to ${broadcastAudienceLabel(broadcast.audience)}.`
          : "Your broadcast was reviewed but not approved, so it hasn't been sent.",
      ],
      details: [
        { label: "Subject", value: broadcast.subject },
        { label: "To", value: broadcastAudienceLabel(broadcast.audience) },
        ...(approved && recipientCount !== undefined ? [{ label: "Recipients", value: String(recipientCount) }] : []),
        ...(note ? [{ label: approved ? "Note from the team" : "Reason", value: note }] : []),
      ],
      closingParagraphs: approved ? [] : ["You're welcome to edit your message and send it for approval again."],
      cta: { path: "/patrons/dashboard/messages", label: `Open the ${PORTAL}` },
    }),
  });
}

// ---------------------------------------------------------------------------
// Executive channel
// ---------------------------------------------------------------------------

export async function notifyAdminsOfPatronMessage(params: {
  thread: { id: string; subject: string; addressedTo: string };
  patronName: string;
  body: string;
  isNewThread: boolean;
}): Promise<void> {
  const { thread, patronName, body, isNewThread } = params;
  await notifyAdmins({
    roles: ["MEMBERSHIP_OFFICER"],
    template: "admin-patron-message",
    entityType: "PatronThread",
    entityId: thread.id,
    bell: {
      type: "NEW_MESSAGE",
      title: `${isNewThread ? "New message" : "Reply"} from ${patronName}`,
      body: thread.subject,
      link: `/admin/patrons/messages/${thread.id}`,
    },
    build: () => ({
      subject: `${isNewThread ? "New message" : "Reply"} from patron ${patronName}: ${thread.subject}`,
      paragraphs: [
        isNewThread
          ? `${patronName} has written to the executive team through the ${PORTAL}.`
          : `${patronName} has replied in the executive channel.`,
      ],
      details: [
        { label: "To", value: thread.addressedTo },
        { label: "Subject", value: thread.subject },
        { label: "Message", value: excerpt(body) },
      ],
      cta: { path: `/admin/patrons/messages/${thread.id}`, label: "Read and Reply" },
    }),
  });
}

export async function notifyPatronOfReply(params: {
  patron: PatronName;
  thread: { id: string; subject: string };
  body: string;
}): Promise<void> {
  const { patron, thread, body } = params;
  await deliver({
    to: { email: patron.email, firstName: patronSalutation(patron) },
    template: "patron-message-reply",
    entityType: "PatronThread",
    entityId: thread.id,
    build: () => ({
      subject: `Reply from the executive team: ${thread.subject}`,
      paragraphs: ["The executive team has replied to your message."],
      details: [
        { label: "Subject", value: thread.subject },
        { label: "Reply", value: excerpt(body, 600) },
      ],
      cta: { path: `/patrons/dashboard/messages/${thread.id}`, label: "Read the Full Conversation" },
    }),
  });
}

// ---------------------------------------------------------------------------
// Advocacy
// ---------------------------------------------------------------------------

export async function notifyAdminsOfEndorsement(params: {
  campaign: { id: string; title: string };
  patron: PatronName;
  comment: string | null;
}): Promise<void> {
  const { campaign, patron, comment } = params;
  const name = patronDisplayName(patron);
  await notifyAdmins({
    roles: ["MEMBERSHIP_OFFICER"],
    template: "admin-campaign-endorsed",
    entityType: "AdvocacyCampaign",
    entityId: campaign.id,
    bell: {
      type: "SYSTEM",
      title: `${name} endorsed a campaign`,
      body: campaign.title,
      link: `/admin/patrons/advocacy/campaigns/${campaign.id}`,
    },
    build: () => ({
      subject: `${name} endorsed "${campaign.title}"`,
      paragraphs: [`${name} has officially endorsed a campaign in the ${PORTAL}.`],
      details: [
        { label: "Campaign", value: campaign.title },
        ...(comment ? [{ label: "Their comment", value: comment }] : []),
      ],
      cta: { path: `/admin/patrons/advocacy/campaigns/${campaign.id}`, label: "View Endorsements" },
    }),
  });
}

export async function notifyAdminsOfIssueAction(params: {
  issue: { id: string; title: string; status: string };
  patron: PatronName & { phone: string };
  type: string;
  message: string;
}): Promise<void> {
  const { issue, patron, type, message } = params;
  const name = patronDisplayName(patron);
  const isMeeting = type === "MEETING_REQUEST";
  await notifyAdmins({
    roles: ["MEMBERSHIP_OFFICER"],
    template: "admin-issue-patron-action",
    entityType: "AccessibilityIssue",
    entityId: issue.id,
    bell: {
      type: "SYSTEM",
      title: `${name}: ${issueActionLabel(type)}`,
      body: issue.title,
      link: `/admin/patrons/advocacy/issues/${issue.id}`,
    },
    build: () => ({
      subject: `${isMeeting ? "Meeting request" : "Patron statement"} on "${issue.title}"`,
      paragraphs: [
        isMeeting
          ? `${name} has asked to meet university management about an escalated issue. Please arrange the meeting and contact them.`
          : `${name} has issued an official patron statement on an escalated issue.`,
      ],
      details: [
        { label: "Issue", value: issue.title },
        { label: "Status", value: issueStatusLabel(issue.status) },
        { label: isMeeting ? "Their request" : "Statement", value: excerpt(message, 800) },
        { label: "Patron's email", value: patron.email },
        { label: "Patron's telephone", value: patron.phone },
      ],
      cta: { path: `/admin/patrons/advocacy/issues/${issue.id}`, label: "Open the Issue" },
    }),
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function notifyAdminsOfPatronDocument(params: {
  document: { id: string; title: string };
  patron: PatronName;
}): Promise<void> {
  const { document, patron } = params;
  const name = patronDisplayName(patron);
  await notifyAdmins({
    // The library is the librarians' (and super admins') screen.
    roles: ["LIBRARIAN"],
    template: "admin-patron-document",
    entityType: "Document",
    entityId: document.id,
    bell: {
      type: "SYSTEM",
      title: `${name} uploaded a document`,
      body: document.title,
      link: `/admin/library/${document.id}`,
    },
    build: () => ({
      subject: `Document from patron ${name}: ${document.title}`,
      paragraphs: [
        `${name} has uploaded a document in the ${PORTAL}. It is saved as a draft; publish it to share it with all patrons.`,
      ],
      details: [{ label: "Title", value: document.title }],
      cta: { path: `/admin/library/${document.id}`, label: "Review the Document" },
    }),
  });
}

// ---------------------------------------------------------------------------
// Donations
// ---------------------------------------------------------------------------

/** The patron's receipt for an online donation. */
export async function notifyDonationReceived(params: {
  donor: { email: string; title: string | null; fullName: string };
  donation: {
    id: string;
    reference: string;
    amountPesewas: number;
    fund: string;
    anonymous: boolean;
    paidAt: Date;
    paystackTransactionId: string | null;
  };
}): Promise<void> {
  const { donor, donation } = params;
  await deliver({
    to: { email: donor.email, firstName: patronSalutation(donor) },
    template: "donation-receipt",
    entityType: "Donation",
    entityId: donation.id,
    build: (brand) => ({
      subject: `Thank you for your donation of ${formatCedis(donation.amountPesewas)}`,
      paragraphs: [
        `Thank you for your generous gift to the ${brand.siteTitle}. Your support makes a real difference to students with special needs. Please keep this email as your receipt.`,
      ],
      details: [
        { label: "Receipt reference", value: donation.reference },
        { label: "Amount", value: formatCedis(donation.amountPesewas) },
        { label: "Given to", value: donationFundLabel(donation.fund) },
        { label: "Date", value: dateFormat.format(donation.paidAt) },
        { label: "Payment", value: donation.paystackTransactionId ? `Online (Paystack #${donation.paystackTransactionId})` : "Online" },
        {
          label: "Honor Roll",
          value: donation.anonymous ? "Anonymous — your name won't be shown" : "Your name will appear on the Patron Honor Roll",
        },
      ],
      cta: { path: "/patrons/dashboard/finances", label: "View Your Giving" },
    }),
  });
}
