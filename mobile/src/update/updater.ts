import * as Application from "expo-application";
import { Directory, File, Paths } from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";
import { api } from "../api/client";
import type { ReleaseManifest, UpdateVerdict } from "../api/types";
import { createHash } from "./hash-file";

/**
 * Updating an app that is not on Google Play.
 *
 * Nothing updates this app unless it asks, so it asks on startup. What
 * comes back is metadata — a version, a size, a changelog, an address and
 * a SHA-256 — and the phone decides what to do with it.
 *
 * Two checks stand between a download and an install, and it is worth
 * being clear about which does what:
 *
 *  1. **The hash**, here. It proves the file arrived intact and is the one
 *     the association published. A mismatch means it is thrown away.
 *  2. **The signing certificate**, which is Android's own check and the one
 *     that actually matters. Android will not replace an installed app
 *     with one signed by a different key, whatever this code does. That is
 *     why the release key must never be lost.
 *
 * Nothing installs silently. Android shows its own installer and the
 * person presses the button.
 */

export function currentBuildNumber(): number {
  const parsed = Number.parseInt(Application.nativeBuildVersion ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function checkForUpdate(): Promise<UpdateVerdict> {
  const sdk = Platform.OS === "android" ? Number(Platform.Version) : 0;
  return api.get<UpdateVerdict>(`/version?build=${currentBuildNumber()}&sdk=${sdk}`, { open: true });
}

export type DownloadProgress = (fractionDone: number) => void;

export class UpdateError extends Error {}

/**
 * Fetches the APK and checks it before anything is done with it.
 *
 * It goes to the app's own cache directory rather than the shared
 * Downloads folder: a half-finished APK sitting in Downloads is something
 * somebody will find months later and try to install.
 */
export async function downloadUpdate(
  release: ReleaseManifest,
  onProgress?: DownloadProgress,
): Promise<string> {
  const target = new File(new Directory(Paths.cache), `assn-${release.version}-${release.buildNumber}.apk`);

  // A previous attempt may have left one behind, whole or half-written.
  if (target.exists) target.delete();

  const task = File.createDownloadTask(release.apkUrl, target, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (!onProgress) return;
      const total = totalBytes || release.sizeBytes;
      if (total > 0) onProgress(Math.min(1, bytesWritten / total));
    },
  });

  const downloaded = await task.downloadAsync();
  if (!downloaded?.uri) throw new UpdateError("The download didn't finish. Please try again.");

  const actual = await createHash(downloaded.uri);
  if (actual.toLowerCase() !== release.sha256.toLowerCase()) {
    // Not "probably corrupt" — discarded either way, because from here
    // there is no telling a broken download from a substituted one.
    if (downloaded.exists) downloaded.delete();
    throw new UpdateError(
      "That download didn't match what the association published, so it has been discarded. Please try again.",
    );
  }

  return downloaded.uri;
}

/**
 * Hands the verified file to Android, which shows its own installer.
 *
 * REQUEST_INSTALL_PACKAGES is declared in app.json; the first time, Android
 * sends the person to a settings screen to allow it. That prompt is
 * Android's and cannot be skipped, which is exactly as it should be.
 */
export async function installUpdate(fileUri: string): Promise<void> {
  if (Platform.OS !== "android") throw new UpdateError("Updates are handled by the store on this platform.");

  // A content:// address, because Android refuses a file:// one from
  // another app — which the installer is.
  const contentUri = new File(fileUri).contentUri;
  await IntentLauncher.startActivityAsync("android.intent.action.INSTALL_PACKAGE", {
    data: contentUri,
    // FLAG_GRANT_READ_URI_PERMISSION — the installer has to read our file.
    flags: 1,
  });
}
