import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * These cover the checks that replace "the file bytes passed through our
 * server" once enrollment uploads go straight from the browser to R2.
 *
 * R2 itself is mocked — deliberately, and in the failure-injection style: the
 * point is to prove that a forged ticket, a missing object, an oversized
 * object, or bytes that don't match their declared type are all refused, which
 * means driving those exact conditions rather than a real bucket.
 */

const r2 = vi.hoisted(() => ({
  getObjectMetadata: vi.fn(),
  readObjectHeadBytes: vi.fn(),
  deleteObject: vi.fn(async () => {}),
  getPresignedUploadUrl: vi.fn(async () => "https://r2.example/signed-put"),
  buildPublicUrl: vi.fn((key: string) => `https://cdn.example/${key}`),
  generateObjectKey: vi.fn((prefix: string, name: string) => `${prefix}/generated-${name}`),
  isR2Configured: vi.fn(() => true),
}));

vi.mock("@/lib/storage/r2", () => r2);

const { requestEnrollmentUpload, adoptEnrollmentUpload, EnrollmentUploadError } = await import(
  "@/lib/services/enrollment-upload-service"
);

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

async function issuePassportTicket(mimeType = "image/jpeg", filename = "photo.jpg") {
  const ticket = await requestEnrollmentUpload({ kind: "passport", filename, mimeType, fileSize: 1000 });
  if (!ticket.ok || ticket.mode !== "upload") throw new Error("expected an upload ticket");
  return ticket.token;
}

beforeEach(() => {
  process.env.AUTH_SECRET ||= "test-secret-for-enrollment-upload-tickets";
  vi.clearAllMocks();
  r2.isR2Configured.mockReturnValue(true);
  r2.buildPublicUrl.mockImplementation((key: string) => `https://cdn.example/${key}`);
  r2.generateObjectKey.mockImplementation((prefix: string, name: string) => `${prefix}/generated-${name}`);
  r2.getPresignedUploadUrl.mockResolvedValue("https://r2.example/signed-put");
});

describe("enrollment upload tickets", () => {
  it("accepts an upload whose stored bytes match the type it was issued for", async () => {
    const token = await issuePassportTicket();
    r2.getObjectMetadata.mockResolvedValue({ size: 1000, contentType: "image/jpeg", lastModified: new Date() });
    r2.readObjectHeadBytes.mockResolvedValue(JPEG);

    await expect(adoptEnrollmentUpload("passport", token)).resolves.toBe(
      "https://cdn.example/members/generated-photo.jpg",
    );
    expect(r2.deleteObject).not.toHaveBeenCalled();
  });

  it("rejects a ticket whose signature has been tampered with", async () => {
    const token = await issuePassportTicket();
    // Flip the last character of the signature.
    const forged = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");

    await expect(adoptEnrollmentUpload("passport", forged)).rejects.toBeInstanceOf(EnrollmentUploadError);
    // Never even looked the object up — the ticket didn't survive verification.
    expect(r2.getObjectMetadata).not.toHaveBeenCalled();
  });

  it("rejects a ticket whose payload has been swapped for another object key", async () => {
    const token = await issuePassportTicket();
    const signature = token.slice(token.lastIndexOf(".") + 1);
    const forgedPayload = Buffer.from(
      JSON.stringify({ k: "library/someone-elses-private-doc.pdf", kind: "passport", ct: "image/jpeg", exp: Date.now() + 60_000 }),
    ).toString("base64url");

    await expect(
      adoptEnrollmentUpload("passport", `${forgedPayload}.${signature}`),
    ).rejects.toBeInstanceOf(EnrollmentUploadError);
    expect(r2.getObjectMetadata).not.toHaveBeenCalled();
  });

  it("rejects a passport ticket presented as a medical report", async () => {
    const token = await issuePassportTicket();
    await expect(adoptEnrollmentUpload("medical", token)).rejects.toBeInstanceOf(EnrollmentUploadError);
  });

  it("rejects a ticket for an object that was never uploaded", async () => {
    const token = await issuePassportTicket();
    r2.getObjectMetadata.mockResolvedValue(null);

    await expect(adoptEnrollmentUpload("passport", token)).rejects.toBeInstanceOf(EnrollmentUploadError);
  });

  it("rejects and deletes an object larger than the limit it was authorised for", async () => {
    const token = await issuePassportTicket();
    r2.getObjectMetadata.mockResolvedValue({
      size: 50 * 1024 * 1024,
      contentType: "image/jpeg",
      lastModified: new Date(),
    });
    r2.readObjectHeadBytes.mockResolvedValue(JPEG);

    await expect(adoptEnrollmentUpload("passport", token)).rejects.toBeInstanceOf(EnrollmentUploadError);
    expect(r2.deleteObject).toHaveBeenCalledWith("members/generated-photo.jpg");
  });

  it("rejects and deletes an object whose bytes contradict its declared type", async () => {
    // Ticket says image/jpeg; the bytes actually in the bucket are a PDF.
    const token = await issuePassportTicket();
    r2.getObjectMetadata.mockResolvedValue({ size: 1000, contentType: "image/jpeg", lastModified: new Date() });
    r2.readObjectHeadBytes.mockResolvedValue(PDF);

    await expect(adoptEnrollmentUpload("passport", token)).rejects.toBeInstanceOf(EnrollmentUploadError);
    expect(r2.deleteObject).toHaveBeenCalledWith("members/generated-photo.jpg");
  });

  it("rejects and deletes an object that isn't a recognisable format at all", async () => {
    const token = await issuePassportTicket();
    r2.getObjectMetadata.mockResolvedValue({ size: 1000, contentType: "image/jpeg", lastModified: new Date() });
    r2.readObjectHeadBytes.mockResolvedValue(new Uint8Array(16).fill(0x41));

    await expect(adoptEnrollmentUpload("passport", token)).rejects.toBeInstanceOf(EnrollmentUploadError);
    expect(r2.deleteObject).toHaveBeenCalled();
  });

  it("accepts a PDF medical report", async () => {
    const ticket = await requestEnrollmentUpload({
      kind: "medical",
      filename: "report.pdf",
      mimeType: "application/pdf",
      fileSize: 4 * 1024 * 1024,
    });
    if (!ticket.ok || ticket.mode !== "upload") throw new Error("expected an upload ticket");

    r2.getObjectMetadata.mockResolvedValue({
      size: 4 * 1024 * 1024,
      contentType: "application/pdf",
      lastModified: new Date(),
    });
    r2.readObjectHeadBytes.mockResolvedValue(PDF);

    await expect(adoptEnrollmentUpload("medical", ticket.token)).resolves.toContain("report.pdf");
  });

  it("accepts a PNG photo of a medical report", async () => {
    const ticket = await requestEnrollmentUpload({
      kind: "medical",
      filename: "scan.png",
      mimeType: "image/png",
      fileSize: 2000,
    });
    if (!ticket.ok || ticket.mode !== "upload") throw new Error("expected an upload ticket");

    r2.getObjectMetadata.mockResolvedValue({ size: 2000, contentType: "image/png", lastModified: new Date() });
    r2.readObjectHeadBytes.mockResolvedValue(PNG);

    await expect(adoptEnrollmentUpload("medical", ticket.token)).resolves.toContain("scan.png");
  });

  it("refuses to issue a ticket for a file over its per-field limit", async () => {
    const ticket = await requestEnrollmentUpload({
      kind: "passport",
      filename: "huge.jpg",
      mimeType: "image/jpeg",
      fileSize: 20 * 1024 * 1024,
    });
    expect(ticket.ok).toBe(false);
    expect(r2.getPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it("refuses to issue a ticket for a type the server would never accept", async () => {
    const ticket = await requestEnrollmentUpload({
      kind: "passport",
      filename: "payload.svg",
      mimeType: "image/svg+xml",
      fileSize: 1000,
    });
    expect(ticket.ok).toBe(false);
    expect(r2.getPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it("requires an attachment when uploads are actually available", async () => {
    await expect(adoptEnrollmentUpload("passport", "")).rejects.toBeInstanceOf(EnrollmentUploadError);
  });

  it("allows a missing attachment only where R2 isn't configured at all", async () => {
    r2.isR2Configured.mockReturnValue(false);
    await expect(adoptEnrollmentUpload("passport", "")).resolves.toBeNull();
  });
});
