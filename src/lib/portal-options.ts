/**
 * The fixed choices shared by the Student and Alumni portals and their admin
 * pages — barrier report stages, kinds of support a student can ask for,
 * mentorship states and the opportunity board. Plain data, safe to import
 * from client components.
 *
 * The patrons' own lists (donation funds, broadcast audiences, issue
 * categories) live in patron-portal-options and are re-used from there
 * rather than duplicated: a barrier a student reports and an issue escalated
 * to the patrons describe the same campus, so they share one set of
 * categories.
 */

import { formatCedis } from "@/lib/patron-portal-options";

// --- Barrier reports ---------------------------------------------------------

/**
 * The stages a student's report moves through, in order. ESCALATED sits
 * between "we're on it" and "resolved" because that is exactly what it means
 * here: the executives could not settle it on campus and have put it to the
 * patrons.
 */
export const BARRIER_STAGES = [
  { value: "SUBMITTED", label: "Submitted", detail: "Received — waiting for an executive to pick it up." },
  { value: "UNDER_REVIEW", label: "Under Review", detail: "An executive is looking into what happened." },
  { value: "IN_PROGRESS", label: "Being Fixed", detail: "Taken up with the department or office responsible." },
  { value: "ESCALATED", label: "Escalated to Patrons", detail: "Put to the patrons for intervention." },
  { value: "RESOLVED", label: "Resolved", detail: "Sorted out — with a note on what changed." },
] as const;

export type BarrierStatusValue = (typeof BARRIER_STAGES)[number]["value"] | "CLOSED";

export const BARRIER_STATUS_VALUES: [BarrierStatusValue, ...BarrierStatusValue[]] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "IN_PROGRESS",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

export function barrierStatusLabel(value: string): string {
  if (value === "CLOSED") return "Closed";
  return BARRIER_STAGES.find((s) => s.value === value)?.label ?? value;
}

/** How far along the tracker a status sits, for the progress bar. */
export function barrierStageIndex(value: string): number {
  const index = BARRIER_STAGES.findIndex((s) => s.value === value);
  // A closed report never reached the end, so it shows no progress beyond review.
  if (index === -1) return 1;
  return index;
}

/** Statuses that still need somebody to do something. */
export const OPEN_BARRIER_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "ESCALATED"] as const;

/**
 * What a student may attach as evidence: a photo of the barrier, a voice note
 * describing it (which is often far easier than typing), or a document.
 */
export const BARRIER_EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
] as const;

export const MAX_BARRIER_EVIDENCE_BYTES = 20 * 1024 * 1024;
export const MAX_BARRIER_EVIDENCE_FILES = 3;

export function isAudioType(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}

// --- Support requests --------------------------------------------------------

export const SUPPORT_REQUEST_TYPES = [
  {
    value: "ASSISTIVE_TECH",
    label: "Assistive technology or device",
    description: "A screen reader, braille materials, a hearing aid, recorder or similar.",
    needsAmount: false,
  },
  {
    value: "NOTE_TAKER",
    label: "Lecture note-taker",
    description: "Someone to take notes with you in lectures, or to share theirs.",
    needsAmount: false,
  },
  {
    value: "WELFARE",
    label: "Welfare or emergency financial support",
    description: "Urgent help with a cost you can't meet — say how much and what it's for.",
    needsAmount: true,
  },
  {
    value: "OTHER",
    label: "Something else",
    description: "Any other assistance you need from the association.",
    needsAmount: false,
  },
] as const;

export type SupportRequestTypeValue = (typeof SUPPORT_REQUEST_TYPES)[number]["value"];
export const SUPPORT_REQUEST_TYPE_VALUES = SUPPORT_REQUEST_TYPES.map((t) => t.value) as [
  SupportRequestTypeValue,
  ...SupportRequestTypeValue[],
];

export function supportRequestTypeLabel(value: string): string {
  return SUPPORT_REQUEST_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const SUPPORT_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  DECLINED: "Not approved",
  FULFILLED: "Provided",
};

export function supportStatusLabel(value: string): string {
  return SUPPORT_STATUS_LABELS[value] ?? value;
}

/** Still waiting on an executive. */
export const OPEN_SUPPORT_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] as const;

/** Where a fulfilled request's spending lands in the finance ledger. */
export const SUPPORT_EXPENSE_CATEGORY: Record<SupportRequestTypeValue, string> = {
  ASSISTIVE_TECH: "ASSISTIVE_TECHNOLOGY",
  NOTE_TAKER: "STUDENT_WELFARE",
  WELFARE: "STUDENT_WELFARE",
  OTHER: "OTHER",
};

// --- Mentorship --------------------------------------------------------------

export const MENTORSHIP_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Awaiting the mentor",
  ACTIVE: "Active",
  DECLINED: "Not taken up",
  ENDED: "Ended",
};

export function mentorshipStatusLabel(value: string): string {
  return MENTORSHIP_STATUS_LABELS[value] ?? value;
}

export const SESSION_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// --- The opportunity board ---------------------------------------------------

export const OPPORTUNITY_TYPES = [
  { value: "JOB", label: "Job", plural: "Jobs" },
  { value: "INTERNSHIP", label: "Internship", plural: "Internships" },
  { value: "SCHOLARSHIP", label: "Scholarship", plural: "Scholarships" },
  { value: "VOLUNTEER", label: "Volunteering", plural: "Volunteering" },
] as const;

export type OpportunityTypeValue = (typeof OPPORTUNITY_TYPES)[number]["value"];
export const OPPORTUNITY_TYPE_VALUES = OPPORTUNITY_TYPES.map((t) => t.value) as [
  OpportunityTypeValue,
  ...OpportunityTypeValue[],
];

export function opportunityTypeLabel(value: string): string {
  return OPPORTUNITY_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting approval",
  APPROVED: "Published",
  REJECTED: "Not approved",
};

// --- Alumni standing ---------------------------------------------------------

/**
 * What an alumnus's engagement is called on their dashboard. Earned by
 * mentoring, giving or backing campaigns — never by graduation year, so a
 * recent graduate with time to give ranks the same as one with money to give.
 * Ordered from highest to lowest; the first one that fits wins.
 */
export const ALUMNI_RANKS = [
  {
    label: "Champion",
    minMentees: 3,
    minGivingPesewas: 200_000,
    describe: "Mentoring three or more students, or having given GH₵ 2,000 or more.",
  },
  {
    label: "Ally",
    minMentees: 1,
    minGivingPesewas: 50_000,
    describe: "Mentoring a student, or having given GH₵ 500 or more.",
  },
  {
    label: "Supporter",
    minMentees: 0,
    minGivingPesewas: 1,
    describe: "Having given to the association or backed a campaign.",
  },
] as const;

export interface AlumniStanding {
  label: string;
  /** What this rank means, and what the next one takes. */
  detail: string;
}

export function alumniRank(params: {
  activeMentees: number;
  lifetimeGivingPesewas: number;
  endorsements: number;
}): AlumniStanding {
  const { activeMentees, lifetimeGivingPesewas, endorsements } = params;
  for (const rank of ALUMNI_RANKS) {
    const byMentoring = rank.minMentees > 0 && activeMentees >= rank.minMentees;
    const byGiving = lifetimeGivingPesewas >= rank.minGivingPesewas;
    const bySupport = rank.label === "Supporter" && endorsements > 0;
    if (byMentoring || byGiving || bySupport) {
      return { label: rank.label, detail: rank.describe };
    }
  }
  return {
    label: "Graduate",
    detail: `Mentor a student, back a campaign or give ${formatCedis(50_000)} to become an Ally.`,
  };
}
