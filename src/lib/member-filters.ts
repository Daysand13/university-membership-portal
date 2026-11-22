import { MEMBERSHIP_TYPE_LABELS } from "@/lib/validations/membership";

/**
 * The members list's filters, read from the address bar.
 *
 * One reader for the page and for its PDF export, so "Export PDF" can never
 * describe or contain a different list from the one on screen — the export
 * used to read each filter for itself, and a filter added to one and not
 * the other would have drifted silently.
 *
 * Plain functions, no database, so they can be tested directly.
 */

export const MEMBER_SORT_OPTIONS = ["newest", "oldest", "name"] as const;
export type MemberSort = (typeof MEMBER_SORT_OPTIONS)[number];

export interface MemberListFilter {
  search?: string;
  academicDepartment?: string;
  programme?: string;
  membershipType?: string;
  gender?: string;
  applicationTrack?: string;
  /** "Level 200" for an undergraduate, "Year 2" for a postgraduate. */
  level?: string;
  /**
   * Special needs categories — a member in ANY of them. Several may be
   * chosen at once: "everybody with a visual impairment or deafblindness".
   */
  categories?: string[];
  campus?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: MemberSort;
}

/** Next's searchParams object, or a URLSearchParams: either way, as one shape. */
type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function toSearchParams(params: Params): URLSearchParams {
  if (params instanceof URLSearchParams) return params;
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => out.append(key, v));
    else if (value) out.set(key, value);
  }
  return out;
}

function one(sp: URLSearchParams, key: string): string | undefined {
  const value = sp.get(key)?.trim();
  return value ? value : undefined;
}

export function memberFilterFrom(params: Params): MemberListFilter {
  const sp = toSearchParams(params);
  const rawSort = sp.get("sort") ?? "";
  const categories = [...new Set(sp.getAll("category").map((c) => c.trim()).filter(Boolean))];
  return {
    search: one(sp, "q"),
    academicDepartment: one(sp, "department"),
    programme: one(sp, "programme"),
    membershipType: one(sp, "membershipType"),
    gender: one(sp, "gender"),
    applicationTrack: one(sp, "track"),
    level: one(sp, "level"),
    categories: categories.length > 0 ? categories : undefined,
    campus: one(sp, "campus"),
    status: one(sp, "status"),
    dateFrom: one(sp, "from"),
    dateTo: one(sp, "to"),
    sort: (MEMBER_SORT_OPTIONS as readonly string[]).includes(rawSort) ? (rawSort as MemberSort) : "newest",
  };
}

/** The filters as an address, repeated keys and all — for "Export PDF". */
export function memberFilterQuery(params: Params): string {
  return toSearchParams(params).toString();
}

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Active", SUSPENDED: "Suspended", INACTIVE: "Inactive" };

/**
 * The filters in words: "Visual Impairment or Deaf · Undergraduate · Level 200".
 *
 * Read out above the list so somebody using a screen reader hears what they
 * are looking at without going back through every control, and printed on
 * the PDF so a list handed round says what it is a list of.
 */
export function describeMemberFilter(filter: MemberListFilter): string[] {
  const parts: string[] = [];
  if (filter.search) parts.push(`Search: “${filter.search}”`);
  if (filter.categories?.length) parts.push(`Special needs: ${filter.categories.join(" or ")}`);
  if (filter.applicationTrack) parts.push(filter.applicationTrack === "POSTGRADUATE" ? "Postgraduate" : "Undergraduate");
  if (filter.level) parts.push(filter.level);
  if (filter.academicDepartment) parts.push(`Department: ${filter.academicDepartment}`);
  if (filter.programme) parts.push(`Programme: ${filter.programme}`);
  if (filter.membershipType) {
    const label = MEMBERSHIP_TYPE_LABELS[filter.membershipType as keyof typeof MEMBERSHIP_TYPE_LABELS];
    parts.push(`Membership type: ${label ?? filter.membershipType}`);
  }
  if (filter.gender) parts.push(filter.gender === "MALE" ? "Male" : "Female");
  if (filter.campus) parts.push(`Campus: ${filter.campus}`);
  if (filter.status) parts.push(`Status: ${STATUS_LABELS[filter.status] ?? filter.status}`);
  if (filter.dateFrom) parts.push(`Joined from ${filter.dateFrom}`);
  if (filter.dateTo) parts.push(`Joined up to ${filter.dateTo}`);
  return parts;
}

/**
 * The year groups to offer for each track: the standard ones first, in
 * order, then anything else members actually have on file.
 *
 * The second half matters. A record entered before the forms had a fixed
 * list — "Level 2", "300", "Year One" — is still somebody, and a filter
 * that cannot select them hides them from every list built with it.
 */
export function levelOptions(standard: readonly string[], onFile: readonly string[]): string[] {
  const known = new Set(standard);
  const extra = [...new Set(onFile.map((l) => l.trim()).filter((l) => l && !known.has(l)))].sort();
  return [...standard, ...extra];
}

/**
 * The categories to offer: the list administrators manage, in their order,
 * then any category a member has on file that is no longer on it — renamed
 * or retired since they joined.
 */
export function categoryOptions(managed: readonly string[], onFile: readonly string[]): string[] {
  const known = new Set(managed);
  const extra = [...new Set(onFile.map((c) => c.trim()).filter((c) => c && !known.has(c)))].sort();
  return [...managed, ...extra];
}
