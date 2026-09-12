import "server-only";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { getEmailBrand } from "@/lib/services/content-service";
import { accountNoticeEmail, type EmailBrand, type NoticeDetail } from "@/lib/email/templates";

/**
 * Emails a person whenever something changes on their account — above all,
 * changes an administrator makes that they would otherwise never hear about:
 * being appointed to (or removed from) an executive position, a status
 * change, a corrected record, a new enrollment cycle, graduation, their
 * profile being made public, a password change, a dues payment.
 *
 * Every function here is best-effort and never throws. Each one runs after
 * the change it describes has already been saved; an email provider outage
 * must not turn a successful admin action into an error, or tempt someone
 * into repeating a change that already happened. Every send (and failure) is
 * still recorded at Admin > Email Logs by sendEmail.
 */

type Recipient = { email: string; firstName: string };

interface NoticeContent {
  subject: string;
  paragraphs: string[];
  bullets?: string[];
  details?: NoticeDetail[];
  closingParagraphs?: string[];
  /** A path on this site; dropped if NEXT_PUBLIC_APP_URL isn't configured. */
  cta?: { path: string; label: string };
  securityNote?: boolean;
}

const CONTACT_LINE = "If you have any questions about this, please contact the association through the Contact page on our website.";

function siteUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  return base ? `${base}${path}` : null;
}

export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

async function deliver(params: {
  to: Recipient;
  template: string;
  entityType: string;
  entityId: string;
  build: (brand: EmailBrand) => NoticeContent;
}): Promise<void> {
  const { to, template, entityType, entityId, build } = params;
  try {
    const brand = await getEmailBrand();
    const content = build(brand);
    const ctaUrl = content.cta ? siteUrl(content.cta.path) : null;
    const { subject, html } = accountNoticeEmail({
      firstName: to.firstName,
      subject: content.subject,
      paragraphs: content.paragraphs,
      bullets: content.bullets,
      details: content.details,
      closingParagraphs: content.closingParagraphs,
      cta: content.cta && ctaUrl ? { url: ctaUrl, label: content.cta.label } : null,
      securityNote: content.securityNote,
      brand,
    });
    await sendEmail({ to: to.email, subject, html, template, entityType, entityId });
  } catch (err) {
    console.error(`[account-notification] "${template}" email could not be sent — the change itself was saved:`, err);
  }
}

// ---------------------------------------------------------------------------
// Executive positions (Leadership / Patron listings linked to a member)
// ---------------------------------------------------------------------------

export interface TeamListingSnapshot {
  id: string;
  type: "LEADERSHIP" | "PATRON";
  position: string;
  isActive: boolean;
  memberId: string | null;
}

function roleName(type: TeamListingSnapshot["type"]): string {
  return type === "LEADERSHIP" ? "Executive Leadership" : "Patron";
}

async function memberRecipient(memberId: string): Promise<(Recipient & { id: string }) | null> {
  try {
    return await db.member.findUnique({ where: { id: memberId }, select: { id: true, email: true, firstName: true } });
  } catch (err) {
    console.error("[account-notification] could not look up member", memberId, err);
    return null;
  }
}

/**
 * Works out what changed between two versions of a Leadership/Patron listing
 * and tells the affected member(s). Pass `before: null` for a new listing and
 * `after: null` for a deleted one.
 *
 * Only the parts that touch the member's own standing are reported — their
 * appointment, their position, whether the listing is live (which decides
 * whether they're charged the Executive dues rate). Edits to a listing's
 * photo or bio aren't changes to anyone's account.
 */
export async function notifyTeamListingChange(
  before: TeamListingSnapshot | null,
  after: TeamListingSnapshot | null,
): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (before?.memberId && before.memberId !== after?.memberId) {
    tasks.push(sendExecutiveRemoved(before.memberId, before));
  }
  if (after?.memberId && after.memberId !== before?.memberId) {
    tasks.push(sendExecutiveAppointed(after.memberId, after));
  }
  if (before?.memberId && after?.memberId && before.memberId === after.memberId) {
    const changes: string[] = [];
    if (before.position !== after.position) {
      changes.push(`Your position has changed from ${before.position} to ${after.position}.`);
    }
    if (before.isActive !== after.isActive) {
      if (after.type === "LEADERSHIP") {
        changes.push(
          after.isActive
            ? "Your listing is visible on the association's website again, and your membership dues are charged at the Executive rate."
            : "Your listing has been hidden from the association's website. While it is hidden, your membership dues are charged at your standard rate rather than the Executive rate.",
        );
      } else {
        changes.push(
          after.isActive
            ? "Your listing is visible on the association's website again."
            : "Your listing has been hidden from the association's website.",
        );
      }
    }
    if (changes.length > 0) tasks.push(sendExecutiveUpdated(after.memberId, after, changes));
  }

  await Promise.all(tasks);
}

async function sendExecutiveAppointed(memberId: string, listing: TeamListingSnapshot) {
  const member = await memberRecipient(memberId);
  if (!member) return;
  const isLeadership = listing.type === "LEADERSHIP";

  await deliver({
    to: member,
    template: "executive-appointed",
    entityType: "Member",
    entityId: member.id,
    build: (brand) => ({
      subject: `You've been appointed ${listing.position}`,
      paragraphs: [
        isLeadership
          ? `Congratulations! You have been appointed ${listing.position} of the ${brand.siteTitle}, as a member of its Executive Leadership.`
          : `You have been listed as ${listing.position} of the ${brand.siteTitle}.`,
        isLeadership
          ? listing.isActive
            ? "You are now listed with the Executive Leadership on the About Us page of our website, and your membership dues will be charged at the Executive rate from now on."
            : "Your listing will appear on the About Us page of our website once an administrator publishes it. Until then, your membership dues stay at your standard rate."
          : listing.isActive
            ? "You are now listed on the About Us page of our website."
            : "Your listing will appear on the About Us page of our website once an administrator publishes it.",
      ],
      details: [
        { label: "Executive Type", value: roleName(listing.type) },
        { label: "Position", value: listing.position },
      ],
      closingParagraphs: [CONTACT_LINE],
      cta: { path: "/login", label: "Sign In to the Member Portal" },
    }),
  });
}

async function sendExecutiveRemoved(memberId: string, listing: TeamListingSnapshot) {
  const member = await memberRecipient(memberId);
  if (!member) return;
  const isLeadership = listing.type === "LEADERSHIP";

  await deliver({
    to: member,
    template: "executive-removed",
    entityType: "Member",
    entityId: member.id,
    build: (brand) => ({
      subject: "An update to your executive position",
      paragraphs: [
        `You are no longer listed as ${listing.position} (${roleName(listing.type)}) of the ${brand.siteTitle}.`,
        isLeadership
          ? "Your membership itself is not affected. Any membership dues from now on will be charged at your standard rate rather than the Executive rate."
          : "Your membership itself is not affected.",
      ],
      details: [
        { label: "Previous Executive Type", value: roleName(listing.type) },
        { label: "Previous Position", value: listing.position },
      ],
      closingParagraphs: [CONTACT_LINE],
    }),
  });
}

async function sendExecutiveUpdated(memberId: string, listing: TeamListingSnapshot, changes: string[]) {
  const member = await memberRecipient(memberId);
  if (!member) return;

  await deliver({
    to: member,
    template: "executive-updated",
    entityType: "Member",
    entityId: member.id,
    build: () => ({
      subject: "Your executive position has been updated",
      paragraphs: ["An administrator has made the following change to your executive listing:"],
      bullets: changes,
      details: [
        { label: "Executive Type", value: roleName(listing.type) },
        { label: "Current Position", value: listing.position },
      ],
      closingParagraphs: [CONTACT_LINE],
    }),
  });
}

// ---------------------------------------------------------------------------
// Member account
// ---------------------------------------------------------------------------

const MEMBER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  INACTIVE: "Inactive",
};

export async function notifyMemberStatusChange(
  member: { id: string; email: string; firstName: string },
  previous: string,
  next: string,
): Promise<void> {
  if (previous === next) return;

  const explanation =
    next === "ACTIVE"
      ? "Your membership account is active again, so you can sign in to the Member Portal as usual."
      : next === "SUSPENDED"
        ? "Your membership account has been suspended, so you won't be able to sign in to the Member Portal for now."
        : "Your membership account has been marked inactive, so the Member Portal won't be available to you for now.";

  await deliver({
    to: member,
    template: "member-status-changed",
    entityType: "Member",
    entityId: member.id,
    build: () => ({
      subject: "Your membership status has changed",
      paragraphs: ["An administrator has changed the status of your membership account.", explanation],
      details: [
        { label: "Previous Status", value: MEMBER_STATUS_LABEL[previous] ?? previous },
        { label: "New Status", value: MEMBER_STATUS_LABEL[next] ?? next },
      ],
      closingParagraphs: [CONTACT_LINE],
      cta: next === "ACTIVE" ? { path: "/login", label: "Sign In to the Member Portal" } : undefined,
    }),
  });
}

/**
 * An administrator corrected the member's record. Field NAMES are listed,
 * not values: the record includes things like a category of special needs
 * that don't belong in an email. The exceptions are the index number and the
 * email address, which the person needs to know to keep signing in.
 */
export async function notifyMemberRecordCorrected(params: {
  member: { id: string; email: string; firstName: string; indexNumber: string };
  previousEmail: string;
  previousIndexNumber: string;
  changedFields: string[];
}): Promise<void> {
  const { member, previousEmail, previousIndexNumber, changedFields } = params;
  if (changedFields.length === 0) return;

  const details: NoticeDetail[] = [];
  if (member.indexNumber !== previousIndexNumber) {
    details.push({ label: "Your Index Number Is Now", value: member.indexNumber });
  }
  if (member.email !== previousEmail) {
    details.push({ label: "Your Email Address Is Now", value: member.email });
  }

  const tasks: Promise<void>[] = [
    deliver({
      to: member,
      template: "member-record-corrected",
      entityType: "Member",
      entityId: member.id,
      build: () => ({
        subject: "Your membership record has been updated",
        paragraphs: ["An administrator has updated the following details on your membership record:"],
        bullets: changedFields,
        details,
        securityNote: true,
      }),
    }),
  ];

  // The old address hears about it too, so an email change can't happen
  // silently. The new address isn't revealed to it.
  if (previousEmail && previousEmail !== member.email) {
    tasks.push(
      deliver({
        to: { email: previousEmail, firstName: member.firstName },
        template: "member-email-changed",
        entityType: "Member",
        entityId: member.id,
        build: () => ({
          subject: "The email address on your membership account was changed",
          paragraphs: [
            "An administrator has changed the email address on your membership account. Future emails from the association will go to the new address, not this one.",
          ],
          securityNote: true,
        }),
      }),
    );
  }

  await Promise.all(tasks);
}

export async function notifyAccountRemoved(params: {
  recipient: Recipient;
  accountKind: "membership" | "alumni" | "portal";
  entityType: string;
  entityId: string;
}): Promise<void> {
  const { recipient, accountKind, entityType, entityId } = params;
  const label = accountKind === "membership" ? "membership account" : accountKind === "alumni" ? "alumni account" : "portal account";

  await deliver({
    to: recipient,
    template: `${accountKind}-account-removed`,
    entityType,
    entityId,
    build: (brand) => ({
      subject: `Your ${label} has been removed`,
      paragraphs: [
        `Your ${label} with the ${brand.siteTitle} has been removed by an administrator, so you will no longer be able to sign in with it.`,
        "If you believe this was a mistake, please contact the association through the Contact page on our website.",
      ],
    }),
  });
}

export async function notifyGraduationRecorded(params: {
  alumniId: string;
  email: string;
  firstName: string;
  graduationYear: number;
  programme: string;
  studentMembershipClosed: boolean;
}): Promise<void> {
  const { alumniId, email, firstName, graduationYear, programme, studentMembershipClosed } = params;
  await deliver({
    to: { email, firstName },
    template: "graduation-recorded",
    entityType: "AlumniProfile",
    entityId: alumniId,
    build: () => ({
      subject: "Congratulations — your graduation has been recorded",
      paragraphs: [
        "Congratulations! Your graduation has been recorded, and your alumni account has been updated to match.",
        studentMembershipClosed
          ? "Your student membership is now closed. You can keep signing in to the Alumni Portal with your existing password."
          : "You can keep signing in to the Alumni Portal with your existing password.",
      ],
      details: [
        { label: "Class Of", value: String(graduationYear) },
        { label: "Programme", value: programme },
      ],
      cta: { path: "/login", label: "Sign In to the Alumni Portal" },
    }),
  });
}

export async function notifyStandingRestored(params: {
  role: "MEMBER" | "ALUMNI";
  email: string;
  firstName: string;
  entityType: string;
  entityId: string;
}): Promise<void> {
  const { role, email, firstName, entityType, entityId } = params;
  const isMember = role === "MEMBER";
  await deliver({
    to: { email, firstName },
    template: isMember ? "member-standing-restored" : "alumni-standing-restored",
    entityType,
    entityId,
    build: (brand) => ({
      subject: isMember ? "Your student membership has been reactivated" : "Your alumni access has been restored",
      paragraphs: [
        isMember
          ? `An administrator has reactivated your student membership with the ${brand.siteTitle}, so you can sign in to the Member Portal again.`
          : `An administrator has restored your alumni standing with the ${brand.siteTitle}, so you can sign in to the Alumni Portal with your existing password.`,
      ],
      closingParagraphs: [CONTACT_LINE],
      cta: { path: "/login", label: isMember ? "Sign In to the Member Portal" : "Sign In to the Alumni Portal" },
    }),
  });
}

export async function notifyNewEnrollmentCycle(params: {
  userId: string;
  email: string;
  firstName: string;
  indexNumber: string;
  programme: string;
  level: string;
}): Promise<void> {
  const { userId, email, firstName, indexNumber, programme, level } = params;
  await deliver({
    to: { email, firstName },
    template: "enrollment-cycle-added",
    entityType: "User",
    entityId: userId,
    build: () => ({
      subject: "A new period of study has been added to your account",
      paragraphs: [
        "An administrator has added a new period of study to your account, with the details below. Your earlier studies remain on your record.",
      ],
      details: [
        { label: "New Index Number", value: indexNumber },
        { label: "Programme", value: programme },
        { label: "Level", value: level },
      ],
      closingParagraphs: [CONTACT_LINE],
      cta: { path: "/login", label: "Sign In to the Member Portal" },
      securityNote: true,
    }),
  });
}

export async function notifyPasswordChanged(params: {
  portal: "Member" | "Alumni";
  email: string;
  firstName: string;
  entityType: string;
  entityId: string;
}): Promise<void> {
  const { portal, email, firstName, entityType, entityId } = params;
  await deliver({
    to: { email, firstName },
    template: `${portal.toLowerCase()}-password-changed`,
    entityType,
    entityId,
    build: () => ({
      subject: "Your password was changed",
      paragraphs: [
        `The password for your ${portal} Portal account was just changed. If you made this change, no further action is needed.`,
      ],
      details: [
        {
          label: "Changed On",
          value: new Intl.DateTimeFormat("en-GH", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Accra" }).format(new Date()),
        },
      ],
      securityNote: true,
    }),
  });
}

export async function notifyDuesPaymentReceived(params: {
  memberId: string;
  paymentId: string;
  academicYear: string;
  tierLabel: string;
  amountLabel: string;
  reference: string;
  paidAt: Date;
}): Promise<void> {
  const { memberId, paymentId, academicYear, tierLabel, amountLabel, reference, paidAt } = params;
  const member = await memberRecipient(memberId);
  if (!member) return;

  await deliver({
    to: member,
    template: "dues-payment-received",
    entityType: "DuesPayment",
    entityId: paymentId,
    build: () => ({
      subject: `Payment received — ${academicYear} membership dues`,
      paragraphs: ["Thank you — we have received your membership dues payment. Please keep this email as your receipt."],
      details: [
        { label: "Academic Year", value: academicYear },
        { label: "Dues Tier", value: tierLabel },
        { label: "Amount Paid", value: amountLabel },
        { label: "Payment Reference", value: reference },
        {
          label: "Date Paid",
          value: new Intl.DateTimeFormat("en-GH", { dateStyle: "long", timeZone: "Africa/Accra" }).format(paidAt),
        },
      ],
      cta: { path: "/membership/dashboard/dues", label: "View Your Payments" },
    }),
  });
}

// ---------------------------------------------------------------------------
// Alumni account
// ---------------------------------------------------------------------------

export async function notifyAlumniStatusChange(
  alumni: { id: string; email: string; fullName: string },
  previous: string,
  next: string,
): Promise<void> {
  if (previous === next) return;
  await deliver({
    to: { email: alumni.email, firstName: firstNameOf(alumni.fullName) },
    template: "alumni-status-changed",
    entityType: "AlumniProfile",
    entityId: alumni.id,
    build: () => ({
      subject: "Your alumni account status has changed",
      paragraphs: [
        next === "ACTIVE"
          ? "An administrator has reactivated your alumni account, so you can sign in to the Alumni Portal as usual."
          : "An administrator has suspended your alumni account, so you won't be able to sign in to the Alumni Portal for now.",
      ],
      details: [
        { label: "Previous Status", value: MEMBER_STATUS_LABEL[previous] ?? previous },
        { label: "New Status", value: MEMBER_STATUS_LABEL[next] ?? next },
      ],
      closingParagraphs: [CONTACT_LINE],
      cta: next === "ACTIVE" ? { path: "/login", label: "Sign In to the Alumni Portal" } : undefined,
    }),
  });
}

export type AlumniVisibilityChange = "made-public" | "made-private" | "featured" | "unfeatured";

const VISIBILITY_SENTENCE: Record<AlumniVisibilityChange, string> = {
  "made-public": "Your alumni profile is now visible on the association's public website.",
  "made-private": "Your alumni profile is no longer visible on the association's public website.",
  featured: "You are now featured in the Proud Alumni showcase on the association's website.",
  unfeatured: "You are no longer featured in the Proud Alumni showcase on the association's website.",
};

export async function notifyAlumniVisibilityChange(params: {
  alumni: { id: string; email: string; fullName: string; publicSlug: string | null };
  changes: AlumniVisibilityChange[];
}): Promise<void> {
  const { alumni, changes } = params;
  if (changes.length === 0) return;
  const nowPublic = changes.includes("made-public") || changes.includes("featured");

  await deliver({
    to: { email: alumni.email, firstName: firstNameOf(alumni.fullName) },
    template: "alumni-visibility-changed",
    entityType: "AlumniProfile",
    entityId: alumni.id,
    build: () => ({
      subject: "How your alumni profile appears on our website has changed",
      paragraphs: ["An administrator has made the following change to how your profile appears on the association's website:"],
      bullets: changes.map((c) => VISIBILITY_SENTENCE[c]),
      closingParagraphs: [
        nowPublic
          ? "If you would rather not appear on the public website, please contact the association through the Contact page and we will remove it."
          : CONTACT_LINE,
      ],
      cta: nowPublic && alumni.publicSlug ? { path: `/alumni/${alumni.publicSlug}`, label: "View Your Public Profile" } : undefined,
    }),
  });
}

export async function notifyAlumniProfileUpdated(params: {
  alumni: { id: string; email: string; fullName: string };
  changedFields: string[];
}): Promise<void> {
  const { alumni, changedFields } = params;
  if (changedFields.length === 0) return;
  await deliver({
    to: { email: alumni.email, firstName: firstNameOf(alumni.fullName) },
    template: "alumni-profile-updated",
    entityType: "AlumniProfile",
    entityId: alumni.id,
    build: () => ({
      subject: "Confirmation — your alumni profile has been updated",
      paragraphs: ["This email confirms that the following details on your alumni profile were just updated:"],
      bullets: changedFields,
      securityNote: true,
    }),
  });
}
