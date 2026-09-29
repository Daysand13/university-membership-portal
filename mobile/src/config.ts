/**
 * Where the app talks to, and who it says it is.
 *
 * One place, because pointing a build at the wrong association by accident
 * is the sort of mistake that is invisible until somebody's real data
 * turns up in a test run.
 */

/**
 * The website this app is the mobile half of.
 *
 * Overridden per build with EXPO_PUBLIC_API_URL — the staging build points
 * at staging, and a developer's build points at their own machine. Expo
 * inlines EXPO_PUBLIC_* at build time, so this is decided when the APK is
 * made, not when it runs.
 */
export const SITE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://assnuew.com").replace(/\/+$/, "");

export const API_URL = `${SITE_URL}/api/v1/app`;

/**
 * Which environment this build is for, shown in the app so a tester can
 * never wonder which one they are looking at. Production says nothing.
 */
export const ENVIRONMENT = process.env.EXPO_PUBLIC_ENVIRONMENT ?? "production";
export const IS_PRODUCTION = ENVIRONMENT === "production";

/** How long a cached list is worth showing before it is refetched. */
export const CACHE_MINUTES = 30;
