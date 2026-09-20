/**
 * Fixed choices for the public outreach pages — Allies & Champions and
 * Tech & Tutorials — and for alumni's earlier programmes. Plain data,
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

// --- Tutorials ----------------------------------------------------------------

export const TUTORIAL_SOURCES = [
  { value: "YOUTUBE", label: "YouTube", short: "YouTube Tutorials" },
  { value: "TIKTOK", label: "TikTok", short: "TikTok Tips" },
] as const;

export type TutorialSourceValue = (typeof TUTORIAL_SOURCES)[number]["value"];
export const TUTORIAL_SOURCE_VALUES = TUTORIAL_SOURCES.map((s) => s.value) as [TutorialSourceValue, ...TutorialSourceValue[]];

export function tutorialSourceLabel(value: string): string {
  return TUTORIAL_SOURCES.find((s) => s.value === value)?.label ?? value;
}

/**
 * The YouTube video id inside any of the shapes people paste: a watch
 * link, a share link, an embed, or a Short. Returns null for anything
 * else, including a TikTok URL — TikTok has no equivalent id we can build
 * a thumbnail from, so those keep an uploaded one.
 */
export function youTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.slice(1).split("/")[0] || null;
    if (!host.endsWith("youtube.com") && !host.endsWith("youtube-nocookie.com")) return null;
    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery) return fromQuery;
    const match = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** YouTube's own still for a video — no API key, and nothing loads until the card is on screen. */
export function youTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** Privacy-respecting player: nothing is requested from YouTube until someone presses play. */
export function youTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
}

/** The filter tabs across the top of the Tech & Tutorials grid. */
export const TECH_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "SOFTWARE", label: "Software Downloads" },
  { value: "YOUTUBE", label: "YouTube Tutorials" },
  { value: "TIKTOK", label: "TikTok Tips" },
] as const;

/** What someone is asking for on the request form. */
export const TECH_REQUEST_KINDS = [
  { value: "SOFTWARE", label: "Software", hint: "A tool or app you need for your studies." },
  { value: "TUTORIAL", label: "A tutorial", hint: "A walk-through of how to do something." },
] as const;

export type TechRequestKindValue = (typeof TECH_REQUEST_KINDS)[number]["value"];
export const TECH_REQUEST_KIND_VALUES = TECH_REQUEST_KINDS.map((k) => k.value) as [
  TechRequestKindValue,
  ...TechRequestKindValue[],
];
