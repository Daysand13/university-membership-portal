/**
 * The fixed choices used across the Patrons' Portal and its admin pages —
 * donation causes, broadcast audiences, issue stages and so on — with the
 * words people see for each. Plain data, safe to import from client
 * components.
 */

export const DONATION_FUNDS = [
  {
    value: "GENERAL",
    label: "General Association Fund",
    description: "Wherever the association needs it most.",
  },
  {
    value: "ASSISTIVE_TECHNOLOGY",
    label: "Assistive Technology & Devices Fund",
    description: "Screen readers, braille materials, hearing aids and other devices.",
  },
  {
    value: "EMERGENCY_WELFARE",
    label: "Emergency Student Welfare Fund",
    description: "Urgent help for students facing a crisis.",
  },
  {
    value: "ADVOCACY_LEGAL",
    label: "Advocacy & Legal Rights Defense Fund",
    description: "Campaigns and legal support for students' rights.",
  },
] as const;

export type DonationFundValue = (typeof DONATION_FUNDS)[number]["value"];
export const DONATION_FUND_VALUES = DONATION_FUNDS.map((f) => f.value) as [DonationFundValue, ...DonationFundValue[]];

export function donationFundLabel(value: string): string {
  return DONATION_FUNDS.find((f) => f.value === value)?.label ?? value;
}

/** Suggested amounts on the Give Back card, in cedis. */
export const DONATION_PRESETS_CEDIS = [50, 100, 200, 500, 1000] as const;
export const MIN_DONATION_CEDIS = 1;
export const MAX_DONATION_CEDIS = 100_000;

export const EXPENSE_CATEGORIES = [
  { value: "STUDENT_WELFARE", label: "Student Welfare" },
  { value: "EVENTS", label: "Events & Programmes" },
  { value: "ASSISTIVE_TECHNOLOGY", label: "Assistive Technology" },
  { value: "ADVOCACY", label: "Advocacy" },
  { value: "ADMINISTRATION", label: "Administration" },
  { value: "OTHER", label: "Other" },
] as const;

export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORIES)[number]["value"];
export const EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value) as [
  ExpenseCategoryValue,
  ...ExpenseCategoryValue[],
];

export function expenseCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export const BROADCAST_AUDIENCES = [
  {
    value: "ALL_MEMBERS",
    label: "All Members",
    description: "Enrolled students, alumni and executives.",
    dot: "#157a4a",
  },
  {
    value: "STUDENTS",
    label: "Enrolled Students",
    description: "Students with special needs currently enrolled.",
    dot: "#2a78d6",
  },
  {
    value: "ALUMNI",
    label: "Alumni Network",
    description: "Graduates registered in the Alumni Portal.",
    dot: "#4a3aa7",
  },
  {
    value: "EXECUTIVES",
    label: "Executive Board Only",
    description: "Students serving on the executive committee.",
    dot: "#c9971f",
  },
] as const;

export type BroadcastAudienceValue = (typeof BROADCAST_AUDIENCES)[number]["value"];
export const BROADCAST_AUDIENCE_VALUES = BROADCAST_AUDIENCES.map((a) => a.value) as [
  BroadcastAudienceValue,
  ...BroadcastAudienceValue[],
];

export function broadcastAudienceLabel(value: string): string {
  return BROADCAST_AUDIENCES.find((a) => a.value === value)?.label ?? value;
}

export const BROADCAST_STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting approval",
  APPROVED: "Sent",
  REJECTED: "Not approved",
};

/** The stages an escalated issue moves through, in order. */
export const ISSUE_STAGES = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Executive Review" },
  { value: "PATRON_ACTION", label: "Patron Action Taken" },
  { value: "RESOLVED", label: "Resolved" },
] as const;

export type IssueStatusValue = (typeof ISSUE_STAGES)[number]["value"];
export const ISSUE_STATUS_VALUES = ISSUE_STAGES.map((s) => s.value) as [IssueStatusValue, ...IssueStatusValue[]];

export function issueStatusLabel(value: string): string {
  return ISSUE_STAGES.find((s) => s.value === value)?.label ?? value;
}

export const ISSUE_CATEGORIES = [
  { value: "EXAMINATION_VENUES", label: "Examination venues" },
  { value: "LEARNING_MATERIALS", label: "Braille, audio & learning materials" },
  { value: "PHYSICAL_ACCESS", label: "Physical access & barriers" },
  { value: "ASSISTIVE_TECHNOLOGY", label: "Assistive technology" },
  { value: "ACCOMMODATION", label: "Accommodation & housing" },
  { value: "DISCRIMINATION", label: "Discrimination & rights" },
  { value: "OTHER", label: "Other" },
] as const;

export type IssueCategoryValue = (typeof ISSUE_CATEGORIES)[number]["value"];
export const ISSUE_CATEGORY_VALUES = ISSUE_CATEGORIES.map((c) => c.value) as [
  IssueCategoryValue,
  ...IssueCategoryValue[],
];

export function issueCategoryLabel(value: string): string {
  return ISSUE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export const ISSUE_ACTIONS = [
  {
    value: "MEETING_REQUEST",
    label: "Request Meeting with Management",
    past: "requested a meeting with management",
  },
  {
    value: "OFFICIAL_STATEMENT",
    label: "Issue Official Patron Statement",
    past: "issued an official patron statement",
  },
] as const;

export type IssueActionValue = (typeof ISSUE_ACTIONS)[number]["value"];
export const ISSUE_ACTION_VALUES = ISSUE_ACTIONS.map((a) => a.value) as [IssueActionValue, ...IssueActionValue[]];

export function issueActionLabel(value: string): string {
  return ISSUE_ACTIONS.find((a) => a.value === value)?.label ?? value;
}

export const CAMPAIGN_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "ACHIEVED", label: "Achieved" },
  { value: "CLOSED", label: "Closed" },
] as const;

export type CampaignStatusValue = (typeof CAMPAIGN_STATUSES)[number]["value"];
export const CAMPAIGN_STATUS_VALUES = CAMPAIGN_STATUSES.map((s) => s.value) as [
  CampaignStatusValue,
  ...CampaignStatusValue[],
];

export function campaignStatusLabel(value: string): string {
  return CAMPAIGN_STATUSES.find((s) => s.value === value)?.label ?? value;
}

/** Offered first in the executive channel, ahead of individual positions. */
export const WHOLE_EXECUTIVE = "Executive Committee";
/** Used when no leadership listings have been set up yet. */
export const DEFAULT_EXECUTIVE_CONTACTS = ["President", "General Secretary", "Public Relations Officer"];

/** File types a patron can attach or upload: documents and photos of them. */
export const PATRON_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
] as const;

export const MAX_PATRON_DOCUMENT_BYTES = 20 * 1024 * 1024;

export function formatCedis(amountPesewas: number, options?: { compact?: boolean }): string {
  const cedis = amountPesewas / 100;
  if (options?.compact) {
    return `GH₵ ${new Intl.NumberFormat("en-GH", { notation: "compact", maximumFractionDigits: 1 }).format(cedis)}`;
  }
  return `GH₵ ${new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: Number.isInteger(cedis) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cedis)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
