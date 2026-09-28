/**
 * What the app is told, and nothing else.
 *
 * Every record the API hands out passes through one of these. The point is
 * not tidiness: a Prisma row carries whatever columns happen to exist, and
 * returning one whole is how a private field ends up on somebody's phone
 * the day after it is added to the schema. Naming the fields here means a
 * new column is invisible until somebody decides otherwise.
 *
 * Plain functions with no database and no `server-only`, so the shapes can
 * be checked in a test and, later, imported by the app itself for its
 * types.
 */

export interface AppPage {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AppNewsSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  category: string | null;
  author: string | null;
  featured: boolean;
  publishedAt: string | null;
}

export interface AppNewsArticle extends AppNewsSummary {
  content: string;
}

interface NewsRow {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  body?: string;
  coverImageUrl?: string | null;
  featured?: boolean;
  publishedAt?: Date | null;
  category?: { name: string } | null;
  author?: { name: string } | null;
}

export function newsSummary(row: NewsRow): AppNewsSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? null,
    coverImageUrl: row.coverImageUrl ?? null,
    category: row.category?.name ?? null,
    author: row.author?.name ?? null,
    featured: row.featured ?? false,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}

export function newsArticle(row: NewsRow): AppNewsArticle {
  return { ...newsSummary(row), content: row.body ?? "" };
}

export interface AppEventSummary {
  id: string;
  slug: string;
  title: string;
  venue: string;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  category: string | null;
  featured: boolean;
  /** Worked out here so every screen says the same thing about it. */
  isPast: boolean;
}

export interface AppEventDetail extends AppEventSummary {
  description: string;
  registrationUrl: string | null;
  contactInfo: string | null;
}

interface EventRow {
  id: string;
  slug: string;
  title: string;
  venue: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  imageUrl?: string | null;
  featured?: boolean;
  registrationLink?: string | null;
  contactInfo?: string | null;
  category?: { name: string } | null;
}

export function eventSummary(row: EventRow, now: Date = new Date()): AppEventSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    venue: row.venue,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    imageUrl: row.imageUrl ?? null,
    category: row.category?.name ?? null,
    featured: row.featured ?? false,
    isPast: row.endDate.getTime() < now.getTime(),
  };
}

export function eventDetail(row: EventRow, now: Date = new Date()): AppEventDetail {
  return {
    ...eventSummary(row, now),
    description: row.description ?? "",
    registrationUrl: row.registrationLink ?? null,
    contactInfo: row.contactInfo ?? null,
  };
}

/**
 * Paging the app can trust.
 *
 * `hasMore` rather than leaving the app to compare page numbers: an
 * infinite list that has to work that out for itself is an infinite list
 * that asks for page 9 of 8 on a slow connection.
 */
export function pageInfo(result: { page: number; pageSize: number; total: number; totalPages: number }) {
  return {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages: result.totalPages,
    hasMore: result.page < result.totalPages,
  };
}

/** A page number from a query string, never NaN and never page 0. */
export function pageFrom(value: string | null, fallback = 1): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  // Somebody asking for page 100,000 is a script, not a reader.
  return Math.min(parsed, 500);
}

/** A page size from a query string, clamped so one request can't pull everything. */
export function pageSizeFrom(value: string | null, fallback = 12, max = 40): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}
