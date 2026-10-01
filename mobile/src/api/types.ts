/**
 * The shapes the website's app API sends.
 *
 * These mirror src/lib/api/app-shapes.ts on the server. They are written
 * out rather than imported because the app is its own package — but they
 * are the same shapes, and the server's tests assert the field list, so
 * one drifting from the other shows up there rather than here.
 */

export type Audience = "MEMBER" | "ALUMNI" | "PATRON";

export interface ApiFailure {
  ok: false;
  error: string;
  code?: string;
  /** A form that needs correcting: the message for each box, by field name. */
  fieldErrors?: Record<string, string[]>;
}

export interface Paged {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface NewsSummary {
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

export interface NewsArticle extends NewsSummary {
  content: string;
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  venue: string;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  category: string | null;
  featured: boolean;
  isPast: boolean;
}

export interface EventDetail extends EventSummary {
  description: string;
  registrationUrl: string | null;
  contactInfo: string | null;
}

export interface Announcement {
  id: string;
  subject: string;
  bodyHtml: string;
  authorName: string;
  audience: string;
  sentAt: string | null;
  attachmentName: string | null;
  attachmentUrl: string | null;
}

export interface LibraryDocument {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  categorySlug: string | null;
  fileUrl: string | null;
  mimeType: string;
  fileSize: number;
  version: string | null;
  downloadCount: number;
  featured: boolean;
  addedAt: string;
}

export interface DirectoryEntry {
  id: string;
  name: string;
  programme: string;
  graduationYear: number;
  profession: string | null;
  currentPosition: string | null;
  currentOrganization: string | null;
  location: string | null;
  photoUrl: string | null;
  willingToMentor: boolean;
  publicSlug: string | null;
}

export interface DuesPayment {
  id: string;
  academicYear: string;
  amountPesewas: number;
  amountLabel: string;
  status: string;
  paidAt: string | null;
  startedAt: string;
  receiptUrl: string | null;
}

export interface DuesSummary {
  academicYear: string;
  fee: { amountPesewas: number; amountLabel: string; tierLabel: string };
  paid: boolean;
  payments: DuesPayment[];
}

export interface ElectionCandidate {
  id: string;
  name: string;
  position: string;
  photoUrl: string | null;
  manifesto: string | null;
}

export interface ElectionView {
  election: {
    id: string;
    title: string;
    description: string | null;
    phase: string;
    votingOpensAt: string | null;
    votingClosesAt: string | null;
    resultsPublic: boolean;
    candidates: ElectionCandidate[];
  } | null;
  results: unknown | null;
  votingInApp: false;
  votingNotice: string;
}

export interface Identity {
  audience: Audience;
  label: string;
  id: string;
  name: string;
}

export interface SignedIn {
  identity: Identity;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  deviceId: string;
}

export interface MemberProfile {
  id: string;
  name: string;
  indexNumber: string;
  email: string;
  phone: string;
  programme: string;
  level: string;
  campus: string;
  department: string;
  membershipType: string | null;
  status: string;
  photoUrl: string | null;
  joinedAt: string;
  mustChangePassword: boolean;
}

export interface AlumniProfileView {
  id: string;
  name: string;
  email: string;
  phone: string;
  programme: string;
  graduationYear: number;
  profession: string | null;
  currentPosition: string | null;
  currentOrganization: string | null;
  location: string | null;
  status: string;
  photoUrl: string | null;
  willingToMentor: boolean;
}

export interface PatronProfileView {
  id: string;
  name: string;
  email: string;
  phone: string;
  occupation: string;
  organization: string | null;
  status: string;
}

export type Me =
  | { audience: "MEMBER"; profile: MemberProfile }
  | { audience: "ALUMNI"; profile: AlumniProfileView }
  | { audience: "PATRON"; profile: PatronProfileView };

export interface ReleaseManifest {
  version: string;
  buildNumber: number;
  apkUrl: string;
  sha256: string;
  sizeBytes: number;
  changelog: string;
  minimumBuild: number;
  minAndroidSdk: number;
  releasedAt: string;
}

export type UpdateVerdict =
  | { action: "none" }
  | { action: "offer"; release: ReleaseManifest }
  | { action: "require"; release: ReleaseManifest; reason: string }
  | { action: "unsupported-device"; reason: string };
