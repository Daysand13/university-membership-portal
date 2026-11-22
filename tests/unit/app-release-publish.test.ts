import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApkSignatureError, apkSigningCertificates, isSignedByAssociation } from "@/lib/apk-signature";

/**
 * Publishing Android builds without the admin page: who signed the APK,
 * and the route that refuses anything not signed by the association.
 */

const u32 = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
};
const u64 = (n: number) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
};
const lp = (value: Buffer) => Buffer.concat([u32(value.length), value]);

/** A minimal APK as the signing scheme lays it out: entries, signing block, central directory, end record. */
function fakeApk(cert: Buffer, ids: number[] = [0x7109871a]): Buffer {
  const signedData = Buffer.concat([lp(Buffer.alloc(0)), lp(lp(cert))]);
  const signer = Buffer.concat([lp(signedData), lp(Buffer.alloc(0)), lp(Buffer.alloc(0))]);
  const value = lp(lp(signer));
  const pairs = Buffer.concat(ids.map((id) => Buffer.concat([u64(4 + value.length), u32(id), value])));
  const size = pairs.length + 8 + 16;
  const block = Buffer.concat([u64(size), pairs, u64(size), Buffer.from("APK Sig Block 42", "latin1")]);
  const entries = Buffer.from("PK\x03\x04 pretend entries", "latin1");
  const centralDirectory = entries.length + block.length;
  const eocd = Buffer.concat([u32(0x06054b50), Buffer.alloc(8), u32(0), u32(centralDirectory), Buffer.alloc(2)]);
  return Buffer.concat([entries, block, eocd]);
}

const ASSOCIATION_CERT = randomBytes(700);
const ASSOCIATION_SHA = createHash("sha256").update(ASSOCIATION_CERT).digest("hex");

describe("who signed an APK", () => {
  it("reads the certificate from the v2 and v3 signing blocks", () => {
    const certs = apkSigningCertificates(fakeApk(ASSOCIATION_CERT, [0x7109871a, 0xf05368c0]));
    expect(certs).toEqual({ v2: ASSOCIATION_SHA, v3: ASSOCIATION_SHA });
  });

  it("accepts only the association's certificate", () => {
    expect(isSignedByAssociation(fakeApk(ASSOCIATION_CERT), ASSOCIATION_SHA)).toBe(true);
    expect(isSignedByAssociation(fakeApk(randomBytes(700)), ASSOCIATION_SHA)).toBe(false);
  });

  it("refuses something that is not a signed APK", () => {
    expect(() => apkSigningCertificates(Buffer.from("just some text, nothing like a zip"))).toThrow(ApkSignatureError);
    const unsigned = Buffer.concat([u32(0x06054b50), Buffer.alloc(8), u32(0), u32(0), Buffer.alloc(2)]);
    expect(() => apkSigningCertificates(unsigned)).toThrow(ApkSignatureError);
  });
});

// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  uploadBuffer: vi.fn(),
  deleteObject: vi.fn(),
  createRelease: vi.fn(),
  setReleasePublished: vi.fn(),
  findRelease: vi.fn(),
  findAdmin: vi.fn(),
  audit: vi.fn(),
  expectedCert: { value: "" },
}));

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: async () => ({ allowed: true }), clientIpFrom: () => "203.0.113.9" }));
vi.mock("@/lib/storage/r2", () => ({
  isR2Configured: () => true,
  buildPublicUrl: (key: string) => `https://files.example/${key}`,
  R2_PREFIXES: { app: "app" },
  uploadBuffer: mocks.uploadBuffer,
  deleteObject: mocks.deleteObject,
}));
vi.mock("@/lib/db", () => ({
  db: {
    appRelease: { findFirst: mocks.findRelease },
    adminUser: { findFirst: mocks.findAdmin },
    auditLog: { create: mocks.audit },
  },
}));
vi.mock("@/lib/services/app-release-service", async () => {
  class ReleaseError extends Error {}
  return {
    APK_CONTENT_TYPE: "application/vnd.android.package-archive",
    MAX_APK_BYTES: 250 * 1024 * 1024,
    ReleaseError,
    createRelease: mocks.createRelease,
    setReleasePublished: mocks.setReleasePublished,
  };
});
vi.mock("@/lib/apk-signature", async (original) => {
  const real = await original<typeof import("@/lib/apk-signature")>();
  return {
    ...real,
    isSignedByAssociation: (apk: Buffer, expected?: string) => real.isSignedByAssociation(apk, expected ?? mocks.expectedCert.value),
  };
});

const TOKEN = "t".repeat(48);
const ARTIFACT = "https://expo.dev/artifacts/eas/AbC123_x.apk";

function post(body: unknown, token: string | null = TOKEN) {
  return new NextRequest("https://portal.test/api/admin/app-releases/publish", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

describe("publishing a build through the release route", () => {
  const good = fakeApk(ASSOCIATION_CERT);
  const goodSha = createHash("sha256").update(good).digest("hex");
  const body = { artifactUrl: ARTIFACT, sha256: goodSha, version: "1.2.0", buildNumber: 4, changelog: "Mentorship." };

  beforeEach(() => {
    process.env.APP_RELEASE_TOKEN = TOKEN;
    mocks.expectedCert.value = ASSOCIATION_SHA;
    for (const fn of [mocks.uploadBuffer, mocks.deleteObject, mocks.createRelease, mocks.setReleasePublished, mocks.audit]) fn.mockReset();
    mocks.findRelease.mockResolvedValue({ publishedById: "admin-1", minimumBuild: 0, minAndroidSdk: 26 });
    mocks.findAdmin.mockResolvedValue({ id: "admin-1" });
    mocks.createRelease.mockResolvedValue({ id: "rel-1", version: "1.2.0", buildNumber: 4 });
    mocks.deleteObject.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(good), { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.APP_RELEASE_TOKEN;
  });

  it("refuses without the token, or with the wrong one, or when none is set up", async () => {
    const { POST } = await import("@/app/api/admin/app-releases/publish/route");
    expect((await POST(post(body, null))).status).toBe(401);
    expect((await POST(post(body, "x".repeat(48)))).status).toBe(401);
    delete process.env.APP_RELEASE_TOKEN;
    expect((await POST(post(body))).status).toBe(401);
    expect(mocks.uploadBuffer).not.toHaveBeenCalled();
  });

  it("takes only an Expo build link", async () => {
    const { POST } = await import("@/app/api/admin/app-releases/publish/route");
    for (const artifactUrl of ["https://evil.example/app.apk", "http://expo.dev/artifacts/eas/a.apk", "https://expo.dev/artifacts/eas/../x.apk"]) {
      expect((await POST(post({ ...body, artifactUrl }))).status).toBe(400);
    }
  });

  it("refuses a file whose hash isn't the one the caller checked", async () => {
    const { POST } = await import("@/app/api/admin/app-releases/publish/route");
    const reply = await POST(post({ ...body, sha256: "0".repeat(64) }));
    expect(reply.status).toBe(422);
    expect(mocks.uploadBuffer).not.toHaveBeenCalled();
  });

  it("refuses a build signed by anybody but the association", async () => {
    const { POST } = await import("@/app/api/admin/app-releases/publish/route");
    const stranger = fakeApk(randomBytes(700));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(stranger), { status: 200 })));
    const sha256 = createHash("sha256").update(stranger).digest("hex");
    const reply = await POST(post({ ...body, sha256 }));
    expect(reply.status).toBe(422);
    expect(String((await reply.json()).error)).toContain("isn't signed with the association's key");
    expect(mocks.uploadBuffer).not.toHaveBeenCalled();
  });

  it("stores, records and publishes a good build, in the last publisher's name, and says how", async () => {
    const { POST } = await import("@/app/api/admin/app-releases/publish/route");
    const reply = await POST(post(body));
    expect(reply.status).toBe(200);
    expect(await reply.json()).toMatchObject({ ok: true, id: "rel-1", sha256: goodSha, sizeBytes: good.length, published: true });
    expect(mocks.uploadBuffer).toHaveBeenCalledWith(expect.objectContaining({ contentType: "application/vnd.android.package-archive" }));
    expect(mocks.createRelease).toHaveBeenCalledWith(
      expect.objectContaining({ version: "1.2.0", buildNumber: 4, sha256: goodSha, sizeBytes: good.length, minAndroidSdk: 26 }),
      { id: "admin-1" },
    );
    expect(mocks.setReleasePublished).toHaveBeenCalledWith({ id: "rel-1", published: true, admin: { id: "admin-1" } });
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "APP_RELEASE_VIA_TOKEN" }) });
  });

  it("leaves no file behind when the release rules refuse it", async () => {
    const { POST } = await import("@/app/api/admin/app-releases/publish/route");
    const { ReleaseError } = await import("@/lib/services/app-release-service");
    mocks.createRelease.mockRejectedValue(new ReleaseError("Build 4 is not newer than 4."));
    const reply = await POST(post(body));
    expect(reply.status).toBe(422);
    expect(mocks.deleteObject).toHaveBeenCalledTimes(1);
    expect(mocks.setReleasePublished).not.toHaveBeenCalled();
  });
});
