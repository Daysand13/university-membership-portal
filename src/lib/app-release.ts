/**
 * Deciding whether a phone should update itself.
 *
 * The app is not on Google Play, so nothing updates it unless it asks. It
 * asks on startup, this works out the answer, and the phone shows either
 * nothing, a prompt it can dismiss, or a wall it cannot.
 *
 * A wall is a serious thing — somebody on a poor connection in the middle
 * of something is simply stopped — so it is reserved for a release that
 * sets `minimumBuild` above their build, which should mean a security fix
 * or a change that breaks the old app's API calls, and nothing else.
 *
 * No database and no network here, so every branch is checked in a test.
 */

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

export function decideUpdate(params: {
  /** What the phone says it is running. */
  currentBuild: number;
  /** The Android it is running on, if it told us. */
  androidSdk?: number | null;
  /** The newest published release, or null if there is none. */
  latest: ReleaseManifest | null;
}): UpdateVerdict {
  const { currentBuild, androidSdk, latest } = params;
  if (!latest) return { action: "none" };

  // A phone already on it, or somehow ahead of it, is left alone. Ahead
  // happens to whoever is testing the next build; nagging them to install
  // an older one would be worse than useless.
  if (currentBuild >= latest.buildNumber) return { action: "none" };

  // An update it cannot install is not an update. Saying so is kinder than
  // a download that fails at the last step, every time it starts.
  if (androidSdk != null && androidSdk < latest.minAndroidSdk) {
    return {
      action: "unsupported-device",
      reason: `Version ${latest.version} needs a newer Android than this phone has.`,
    };
  }

  if (currentBuild < latest.minimumBuild) {
    return {
      action: "require",
      release: latest,
      reason: "This version of ASSN is no longer supported. Please update to carry on.",
    };
  }

  return { action: "offer", release: latest };
}

/** A build number from a query string. Absent means "an old app" — build 0. */
export function buildFrom(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** "1.4.0" and nothing else: three numbers, no v, no suffix. */
export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/** A SHA-256 as 64 hex characters. Anything else would never match a download. */
export const SHA256_PATTERN = /^[a-fA-F0-9]{64}$/;
