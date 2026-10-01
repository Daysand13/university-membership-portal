import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Uploading a build of the app to the association's storage, and checking
 * what was uploaded before a release is recorded against it.
 *
 * Storage is mocked: nothing here may reach the real bucket.
 */

const r2 = vi.hoisted(() => ({
  isR2Configured: vi.fn(() => true),
  getPresignedUploadUrl: vi.fn(async ({ objectKey }: { objectKey: string }) => `https://signed.example.test/${objectKey}`),
  buildPublicUrl: vi.fn((key: string) => `https://files.example.test/${key}`),
  extractObjectKeyFromPublicUrl: vi.fn((url: string) =>
    url.startsWith("https://files.example.test/") ? url.slice("https://files.example.test/".length) : null,
  ),
  getObjectMetadata: vi.fn(),
  R2_PREFIXES: { app: "app" },
}));
vi.mock("@/lib/storage/r2", () => r2);

const { requestApkUpload, checkStoredApk, ReleaseError, APK_CONTENT_TYPE } = await import(
  "@/lib/services/app-release-service"
);

beforeEach(() => {
  r2.isR2Configured.mockReturnValue(true);
  r2.getObjectMetadata.mockReset();
});

describe("asking for somewhere to put a build", () => {
  it("names the object itself, under app/, and pins the APK type", async () => {
    const ticket = await requestApkUpload({ filename: "assn-1.1.0.apk", fileSize: 101_525_110 });
    expect(ticket.apkUrl).toMatch(/^https:\/\/files\.example\.test\/app\/\d+-assn-1-1-0\.apk$/);
    expect(ticket.contentType).toBe(APK_CONTENT_TYPE);
    expect(r2.getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "application/vnd.android.package-archive" }),
    );
  });

  it("will not take a path from the filename — nobody chooses where in the bucket to write", async () => {
    const ticket = await requestApkUpload({ filename: "../../members/x.apk", fileSize: 10 });
    expect(ticket.apkUrl).not.toContain("..");
    expect(ticket.apkUrl).toMatch(/\/app\/\d+-[^/]+\.apk$/);
  });

  it("refuses anything that isn't an APK, an empty file, and an absurd one", async () => {
    await expect(requestApkUpload({ filename: "assn.zip", fileSize: 10 })).rejects.toBeInstanceOf(ReleaseError);
    await expect(requestApkUpload({ filename: "assn.apk", fileSize: 0 })).rejects.toThrow(/empty/);
    await expect(requestApkUpload({ filename: "assn.apk", fileSize: 900 * 1024 * 1024 })).rejects.toThrow(/larger than/);
  });

  it("says plainly when the site has no storage", async () => {
    r2.isR2Configured.mockReturnValue(false);
    await expect(requestApkUpload({ filename: "assn.apk", fileSize: 10 })).rejects.toThrow(/storage isn't set up/);
  });
});

describe("checking the stored file before a release is recorded", () => {
  it("accepts a stored file of exactly the recorded size", async () => {
    r2.getObjectMetadata.mockResolvedValue({ size: 101_525_110, contentType: APK_CONTENT_TYPE, lastModified: null });
    await expect(checkStoredApk("https://files.example.test/app/1-assn.apk", 101_525_110)).resolves.toBeUndefined();
  });

  it("refuses a short file — an upload that stopped half way", async () => {
    // Recorded as whole, every phone would download it, find the hash
    // wrong, and refuse it: a release dead on arrival.
    r2.getObjectMetadata.mockResolvedValue({ size: 52_000_000, contentType: APK_CONTENT_TYPE, lastModified: null });
    await expect(checkStoredApk("https://files.example.test/app/1-assn.apk", 101_525_110)).rejects.toThrow(
      /may not have finished/,
    );
  });

  it("refuses an address in our storage with nothing there", async () => {
    r2.getObjectMetadata.mockResolvedValue(null);
    await expect(checkStoredApk("https://files.example.test/app/missing.apk", 10)).rejects.toThrow(/no file at that address/);
  });

  it("leaves an address somewhere else to the administrator", async () => {
    await expect(checkStoredApk("https://elsewhere.example.org/assn.apk", 10)).resolves.toBeUndefined();
    expect(r2.getObjectMetadata).not.toHaveBeenCalled();
  });
});
