import "server-only";
import { db } from "@/lib/db";
import type { PatronProfile, Prisma } from "@/generated/prisma/client";
import { LEVELS } from "@/lib/validations/membership";

/**
 * What the Patrons' Portal shows about the membership — always as counts,
 * never as individual students — plus the opted-in alumni directory, the
 * portal-wide search, and the patron's notifications.
 *
 * Privacy rule for this file: nothing here returns a student's name,
 * contact details or support needs. The only people patrons can look up
 * are alumni who chose to appear in the alumni directory, and even then
 * without their email address or telephone number.
 */

const CURRENT_STUDENT: Prisma.MemberWhereInput = { status: "ACTIVE", graduatedAt: null };
const ACTIVE_ALUMNI: Prisma.AlumniProfileWhereInput = { status: "ACTIVE" };
const LISTED_ALUMNI: Prisma.AlumniProfileWhereInput = { status: "ACTIVE", directoryVisible: true };

export interface MembershipOverview {
  /** Every current student and alumnus, each person counted once. */
  totalMembers: number;
  activeStudents: number;
  alumni: number;
  /** Alumni who are also enrolled again (further studies). */
  dualMembers: number;
  mentors: number;
}

export async function getMembershipOverview(): Promise<MembershipOverview> {
  const [activeStudents, alumni, dualMembers, mentors] = await Promise.all([
    db.member.count({ where: CURRENT_STUDENT }),
    db.alumniProfile.count({ where: ACTIVE_ALUMNI }),
    db.alumniProfile.count({ where: { ...ACTIVE_ALUMNI, sourceMember: CURRENT_STUDENT } }),
    db.alumniProfile.count({ where: { ...LISTED_ALUMNI, willingToMentor: true } }),
  ]);
  return { totalMembers: activeStudents + alumni - dualMembers, activeStudents, alumni, dualMembers, mentors };
}

export interface GrowthPoint {
  year: number;
  /** Current students who were admitted that year. */
  students: number;
  /** Alumni who graduated that year. */
  alumni: number;
}

/** New students (by year of admission) and new alumni (by graduation year), oldest year first. */
export async function getMembershipGrowth(years = 6, now = new Date()): Promise<GrowthPoint[]> {
  const lastYear = now.getUTCFullYear();
  const firstYear = lastYear - years + 1;
  const [students, alumni] = await Promise.all([
    db.member.groupBy({
      by: ["yearOfAdmission"],
      where: { ...CURRENT_STUDENT, yearOfAdmission: { gte: firstYear, lte: lastYear } },
      _count: { _all: true },
    }),
    db.alumniProfile.groupBy({
      by: ["graduationYear"],
      where: { ...ACTIVE_ALUMNI, graduationYear: { gte: firstYear, lte: lastYear } },
      _count: { _all: true },
    }),
  ]);
  const points: GrowthPoint[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    points.push({
      year,
      students: students.find((s) => s.yearOfAdmission === year)?._count._all ?? 0,
      alumni: alumni.find((a) => a.graduationYear === year)?._count._all ?? 0,
    });
  }
  return points;
}

/** Current students by level, with postgraduates on their own. */
export async function getLevelDistribution(): Promise<{ label: string; count: number }[]> {
  const [undergraduates, postgraduates] = await Promise.all([
    db.member.groupBy({
      by: ["level"],
      where: { ...CURRENT_STUDENT, NOT: { applicationTrack: "POSTGRADUATE" } },
      _count: { _all: true },
    }),
    db.member.count({ where: { ...CURRENT_STUDENT, applicationTrack: "POSTGRADUATE" } }),
  ]);
  const rows: { label: string; count: number }[] = LEVELS.map((level) => ({
    label: level,
    count: undergraduates.find((u) => u.level === level)?._count._all ?? 0,
  }));
  rows.push({ label: "Postgraduate", count: postgraduates });
  const other = undergraduates
    .filter((u) => !(LEVELS as readonly string[]).includes(u.level))
    .reduce((total, u) => total + u._count._all, 0);
  if (other > 0) rows.push({ label: "Other", count: other });
  return rows;
}

export async function getMentorshipSummary(): Promise<{ mentors: number; byIndustry: { industry: string; count: number }[] }> {
  const groups = await db.alumniProfile.groupBy({
    by: ["industry"],
    where: { ...LISTED_ALUMNI, willingToMentor: true },
    _count: { _all: true },
  });
  const byIndustry = groups
    .map((g) => ({ industry: g.industry?.trim() || "Not stated", count: g._count._all }))
    .sort((a, b) => b.count - a.count);
  return { mentors: byIndustry.reduce((total, g) => total + g.count, 0), byIndustry };
}

// ---------------------------------------------------------------------------
// Alumni directory for patrons
// ---------------------------------------------------------------------------

const DIRECTORY_SELECT = {
  id: true,
  fullName: true,
  graduationYear: true,
  programme: true,
  profession: true,
  currentPosition: true,
  currentOrganization: true,
  industry: true,
  currentLocation: true,
  willingToMentor: true,
  profileImageUrl: true,
} as const;

export type PatronDirectoryEntry = Prisma.AlumniProfileGetPayload<{ select: typeof DIRECTORY_SELECT }>;

export const DIRECTORY_PAGE_SIZE = 24;

export async function listAlumniForPatrons(params: {
  q?: string;
  graduationYear?: number;
  industry?: string;
  mentorsOnly?: boolean;
  page?: number;
}): Promise<{ items: PatronDirectoryEntry[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, params.page ?? 1);
  const and: Prisma.AlumniProfileWhereInput[] = [LISTED_ALUMNI];
  const q = params.q?.trim();
  if (q) {
    and.push({
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { programme: { contains: q, mode: "insensitive" } },
        { profession: { contains: q, mode: "insensitive" } },
        { industry: { contains: q, mode: "insensitive" } },
        { currentOrganization: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (params.graduationYear) and.push({ graduationYear: params.graduationYear });
  if (params.industry) and.push({ industry: { equals: params.industry, mode: "insensitive" } });
  if (params.mentorsOnly) and.push({ willingToMentor: true });
  const where = { AND: and };

  const [items, total] = await Promise.all([
    db.alumniProfile.findMany({
      where,
      select: DIRECTORY_SELECT,
      orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
      skip: (page - 1) * DIRECTORY_PAGE_SIZE,
      take: DIRECTORY_PAGE_SIZE,
    }),
    db.alumniProfile.count({ where }),
  ]);
  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE)) };
}

export async function getDirectoryFilterOptions(): Promise<{ years: number[]; industries: string[] }> {
  const [years, industries] = await Promise.all([
    db.alumniProfile.findMany({
      where: LISTED_ALUMNI,
      distinct: ["graduationYear"],
      select: { graduationYear: true },
      orderBy: { graduationYear: "desc" },
    }),
    db.alumniProfile.findMany({
      where: { ...LISTED_ALUMNI, industry: { not: null } },
      distinct: ["industry"],
      select: { industry: true },
      orderBy: { industry: "asc" },
    }),
  ]);
  return {
    years: years.map((y) => y.graduationYear),
    industries: [...new Set(industries.map((i) => i.industry?.trim()).filter((i): i is string => Boolean(i)))],
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface PortalSearchResults {
  alumni: { id: string; fullName: string; detail: string }[];
  documents: { id: string; title: string; detail: string }[];
  announcements: { id: string; subject: string; detail: string }[];
  campaigns: { id: string; title: string; detail: string }[];
  issues: { id: string; title: string; detail: string }[];
  news: { slug: string; title: string; detail: string }[];
}

const SEARCH_LIMIT = 8;

export async function searchPatronPortal(query: string): Promise<PortalSearchResults> {
  const q = query.trim().slice(0, 100);
  const empty: PortalSearchResults = { alumni: [], documents: [], announcements: [], campaigns: [], issues: [], news: [] };
  if (q.length < 2) return empty;
  const contains = { contains: q, mode: "insensitive" as const };

  const [alumni, documents, announcements, campaigns, issues, news] = await Promise.all([
    db.alumniProfile.findMany({
      where: {
        ...LISTED_ALUMNI,
        OR: [{ fullName: contains }, { profession: contains }, { industry: contains }, { programme: contains }],
      },
      select: { id: true, fullName: true, graduationYear: true, programme: true },
      orderBy: { fullName: "asc" },
      take: SEARCH_LIMIT,
    }),
    db.document.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ title: contains }, { description: contains }],
      },
      select: { id: true, title: true, category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: SEARCH_LIMIT,
    }),
    db.broadcast.findMany({
      where: { status: "APPROVED", OR: [{ subject: contains }, { bodyHtml: contains }] },
      select: { id: true, subject: true, authorName: true },
      orderBy: { sentAt: "desc" },
      take: SEARCH_LIMIT,
    }),
    db.advocacyCampaign.findMany({
      where: { OR: [{ title: contains }, { summary: contains }] },
      select: { id: true, title: true, status: true },
      orderBy: { createdAt: "desc" },
      take: SEARCH_LIMIT,
    }),
    db.accessibilityIssue.findMany({
      where: { OR: [{ title: contains }, { summary: contains }, { location: contains }] },
      select: { id: true, title: true, location: true },
      orderBy: { reportedOn: "desc" },
      take: SEARCH_LIMIT,
    }),
    db.news.findMany({
      where: { status: "PUBLISHED", OR: [{ title: contains }, { excerpt: contains }] },
      select: { slug: true, title: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: SEARCH_LIMIT,
    }),
  ]);

  return {
    alumni: alumni.map((a) => ({ id: a.id, fullName: a.fullName, detail: `Class of ${a.graduationYear} · ${a.programme}` })),
    documents: documents.map((d) => ({ id: d.id, title: d.title, detail: d.category?.name ?? "Document" })),
    announcements: announcements.map((a) => ({ id: a.id, subject: a.subject, detail: `From ${a.authorName}` })),
    campaigns: campaigns.map((c) => ({ id: c.id, title: c.title, detail: c.status === "ACTIVE" ? "Active campaign" : "Campaign" })),
    issues: issues.map((i) => ({ id: i.id, title: i.title, detail: i.location ?? "Escalated issue" })),
    news: news.map((n) => ({ slug: n.slug, title: n.title, detail: "News" })),
  };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface PatronNotification {
  id: string;
  title: string;
  detail: string;
  href: string;
  at: Date;
  unread: boolean;
}

/**
 * The patron's bell: replies waiting in the executive channel (unread until
 * opened), plus anything new since they last opened the menu — decisions on
 * their broadcasts, newly escalated issues and new campaigns.
 */
export async function getPatronNotifications(
  patron: Pick<PatronProfile, "id" | "notificationsSeenAt" | "reviewedAt" | "submittedAt">,
): Promise<{ items: PatronNotification[]; unreadCount: number }> {
  const since = patron.notificationsSeenAt ?? patron.reviewedAt ?? patron.submittedAt;
  const lookback = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const [threads, broadcasts, issues, campaigns] = await Promise.all([
    db.patronThread.findMany({
      where: { patronId: patron.id, unreadByPatron: true },
      select: { id: true, subject: true, lastMessageAt: true },
      orderBy: { lastMessageAt: "desc" },
      take: 10,
    }),
    db.broadcast.findMany({
      where: { patronId: patron.id, status: { not: "PENDING" }, reviewedAt: { gte: lookback } },
      select: { id: true, subject: true, status: true, reviewedAt: true },
      orderBy: { reviewedAt: "desc" },
      take: 5,
    }),
    db.accessibilityIssue.findMany({
      where: { createdAt: { gte: lookback }, status: { not: "RESOLVED" } },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.advocacyCampaign.findMany({
      where: { createdAt: { gte: lookback }, status: "ACTIVE" },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const items: PatronNotification[] = [
    ...threads.map((t) => ({
      id: `thread-${t.id}`,
      title: "New reply from the executive team",
      detail: t.subject,
      href: `/patrons/dashboard/messages/${t.id}`,
      at: t.lastMessageAt,
      unread: true,
    })),
    ...broadcasts.map((b) => ({
      id: `broadcast-${b.id}`,
      title: b.status === "APPROVED" ? "Your broadcast was sent" : "Your broadcast wasn't approved",
      detail: b.subject,
      href: "/patrons/dashboard/messages",
      at: b.reviewedAt!,
      unread: b.reviewedAt! > since,
    })),
    ...issues.map((i) => ({
      id: `issue-${i.id}`,
      title: "Issue escalated to patrons",
      detail: i.title,
      href: `/patrons/dashboard/advocacy/issues/${i.id}`,
      at: i.createdAt,
      unread: i.createdAt > since,
    })),
    ...campaigns.map((c) => ({
      id: `campaign-${c.id}`,
      title: "New advocacy campaign",
      detail: c.title,
      href: `/patrons/dashboard/advocacy/campaigns/${c.id}`,
      at: c.createdAt,
      unread: c.createdAt > since,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return { items: items.slice(0, 12), unreadCount: items.filter((i) => i.unread).length };
}

export async function markPatronNotificationsSeen(patronId: string): Promise<void> {
  await db.patronProfile.update({ where: { id: patronId }, data: { notificationsSeenAt: new Date() } });
}
