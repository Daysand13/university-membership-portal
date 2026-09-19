/**
 * Fixed choices for the public outreach pages — Allies & Champions and
 * Assistive Software — and for alumni's earlier programmes. Plain data,
 * safe to import from client components.
 */

// --- Allies ------------------------------------------------------------------

export const ALLY_TYPES = [
  { value: "INDIVIDUAL", label: "Individual", plural: "Individual Allies" },
  { value: "CORPORATE", label: "Corporate Representative", plural: "Corporate & Institutional Allies" },
] as const;

export type AllyTypeValue = (typeof ALLY_TYPES)[number]["value"];
export const ALLY_TYPE_VALUES = ALLY_TYPES.map((t) => t.value) as [AllyTypeValue, ...AllyTypeValue[]];

// --- Assistive software -------------------------------------------------------

export const SOFTWARE_CATEGORIES = [
  { value: "VISION", label: "Vision & Screen Readers", short: "Vision" },
  { value: "HEARING", label: "Hearing & Captions", short: "Hearing" },
  { value: "COGNITIVE", label: "Cognitive & Learning", short: "Cognitive" },
  { value: "MOBILITY", label: "Mobility & Input Devices", short: "Mobility" },
] as const;

export type SoftwareCategoryValue = (typeof SOFTWARE_CATEGORIES)[number]["value"];
export const SOFTWARE_CATEGORY_VALUES = SOFTWARE_CATEGORIES.map((c) => c.value) as [
  SoftwareCategoryValue,
  ...SoftwareCategoryValue[],
];

export function softwareCategoryLabel(value: string): string {
  return SOFTWARE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export const SOFTWARE_PLATFORMS = [
  { value: "WINDOWS", label: "Windows" },
  { value: "MACOS", label: "macOS" },
  { value: "ANDROID", label: "Android" },
  { value: "IOS", label: "iOS" },
  { value: "LINUX", label: "Linux" },
  { value: "WEB", label: "Web" },
] as const;

export type SoftwarePlatformValue = (typeof SOFTWARE_PLATFORMS)[number]["value"];
export const SOFTWARE_PLATFORM_VALUES = SOFTWARE_PLATFORMS.map((p) => p.value) as [
  SoftwarePlatformValue,
  ...SoftwarePlatformValue[],
];

export function softwarePlatformLabel(value: string): string {
  return SOFTWARE_PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

/** What a requester can say they use — broader than the directory's platforms. */
export const REQUEST_OPERATING_SYSTEMS = ["Windows", "macOS", "Android", "iOS", "Linux", "Other / not sure"] as const;

export const SOFTWARE_REQUEST_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  IN_PROGRESS: "Being sourced",
  FULFILLED: "Provided",
  DECLINED: "Not possible",
};

/**
 * The page's editable settings, stored in SiteSetting under their own key.
 * Tier amounts are in cedis because that is how an administrator thinks of
 * a licence price.
 */
export interface AssistiveTechSettings {
  telegramUrl: string;
  supportEmail: string;
  licenceTierCedis: number;
  hardwareTierCedis: number;
}

export const DEFAULT_ASSISTIVE_TECH_SETTINGS: AssistiveTechSettings = {
  telegramUrl: "",
  supportEmail: "",
  licenceTierCedis: 250,
  hardwareTierCedis: 500,
};

export interface AlliesPageSettings {
  partnershipEmail: string;
}

export const DEFAULT_ALLIES_PAGE_SETTINGS: AlliesPageSettings = {
  partnershipEmail: "",
};

// --- Alumni's earlier programmes -------------------------------------------

export const PRIOR_QUALIFICATIONS = ["Bachelor's degree", "Diploma", "Higher National Diploma", "Other"] as const;

export const DEFAULT_PRIOR_INSTITUTION = "University of Education, Winneba";
