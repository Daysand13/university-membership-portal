import { describe, it, expect } from "vitest";
import {
  validateUploadRequest,
  isAllowedExtension,
  sanitizeFilenameStem,
  sniffImageMimeType,
} from "@/lib/storage/validation";
import { generateObjectKey } from "@/lib/storage/r2";

describe("upload validation", () => {
  it("accepts a valid image under the size limit", () => {
    const result = validateUploadRequest({
      filename: "photo.jpg",
      mimeType: "image/jpeg",
      fileSize: 1024 * 1024,
      category: "image",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects an image over the size limit", () => {
    const result = validateUploadRequest({
      filename: "huge.jpg",
      mimeType: "image/jpeg",
      fileSize: 10 * 1024 * 1024,
      category: "image",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an executable disguised with an allowed extension's mime type", () => {
    const result = validateUploadRequest({
      filename: "payload.exe",
      mimeType: "image/jpeg",
      fileSize: 1000,
      category: "image",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a document type outside the allow-list", () => {
    const result = validateUploadRequest({
      filename: "script.js",
      mimeType: "application/javascript",
      fileSize: 1000,
      category: "document",
    });
    expect(result.ok).toBe(false);
  });
});

describe("filename sanitization", () => {
  it("strips path separators and unsafe characters", () => {
    expect(sanitizeFilenameStem("../../etc/passwd")).not.toContain("/");
    expect(sanitizeFilenameStem("../../etc/passwd")).not.toContain("..");
  });

  it("recognizes allowed extensions case-insensitively", () => {
    expect(isAllowedExtension("Report.PDF")).toBe(true);
    expect(isAllowedExtension("malware.exe")).toBe(false);
  });
});

describe("object key generation", () => {
  it("namespaces keys under the given prefix and preserves a safe extension", () => {
    const key = generateObjectKey("news", "My Cover Photo.PNG", "image/png");
    expect(key.startsWith("news/")).toBe(true);
    expect(key.endsWith(".png")).toBe(true);
    expect(key).not.toContain(" ");
  });

  it("generates unique keys for the same filename", () => {
    const a = generateObjectKey("library", "handbook.pdf", "application/pdf");
    const b = generateObjectKey("library", "handbook.pdf", "application/pdf");
    expect(a).not.toBe(b);
  });
});

describe("image magic-byte sniffing", () => {
  it("identifies a PNG from its header bytes regardless of claimed type", () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffImageMimeType(pngHeader)).toBe("image/png");
  });

  it("identifies a JPEG from its header bytes", () => {
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(sniffImageMimeType(jpegHeader)).toBe("image/jpeg");
  });

  it("returns null for unrecognized bytes", () => {
    const random = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(sniffImageMimeType(random)).toBeNull();
  });
});
