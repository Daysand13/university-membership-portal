"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/admin";
import { ReleaseError, createRelease, setReleasePublished } from "@/lib/services/app-release-service";
import type { ActionState } from "./types";

/**
 * Publishing a build of the Android app.
 *
 * Kept behind site.settings: whatever is published here is what every
 * phone downloads and offers to install, which makes it a rather more
 * consequential form than it looks.
 */

const RELEASES_PATH = "/admin/app-releases";

async function createReleaseActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireCapability("site.settings");

  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const number = (key: string) => {
    const parsed = Number.parseInt(text(key), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  try {
    await createRelease(
      {
        version: text("version"),
        buildNumber: number("buildNumber"),
        apkUrl: text("apkUrl"),
        sha256: text("sha256").toLowerCase(),
        sizeBytes: number("sizeBytes"),
        changelog: text("changelog"),
        minimumBuild: number("minimumBuild"),
        minAndroidSdk: number("minAndroidSdk") || 26,
      },
      admin,
    );
  } catch (err) {
    if (err instanceof ReleaseError) return { error: err.message };
    throw err;
  }

  revalidatePath(RELEASES_PATH);
  return { success: true, message: "Saved. It is not offered to anybody until you publish it." };
}

async function setReleasePublishedActionImpl(id: string, published: boolean): Promise<void> {
  const admin = await requireCapability("site.settings");
  try {
    await setReleasePublished({ id, published, admin });
  } catch (err) {
    if (err instanceof ReleaseError) throw new Error(err.message);
    throw err;
  }
  revalidatePath(RELEASES_PATH);
}

export const createReleaseAction = withActionErrorHandling("createReleaseAction", createReleaseActionImpl);
export const setReleasePublishedAction = withVoidActionErrorHandling(
  "setReleasePublishedAction",
  setReleasePublishedActionImpl,
);
