import { describe, expect, it } from "vitest";
import { fitWithin, formatBytes, isImage, mimeFromName } from "../src/join/shrink";

describe("making a phone photo small enough to send", () => {
  it("scales a 4000-pixel camera photo down to the limit, keeping its shape", () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 });
    expect(fitWithin(3000, 4000, 1000)).toEqual({ width: 750, height: 1000 });
  });

  it("never enlarges a photo that is already small", () => {
    // Enlarging only adds bytes and blur.
    expect(fitWithin(640, 480, 1000)).toEqual({ width: 640, height: 480 });
  });

  it("knows a document from its name when the picker doesn't say", () => {
    expect(mimeFromName("Report.PDF")).toBe("application/pdf");
    expect(mimeFromName("assessment.docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(mimeFromName("IMG_2001.HEIC")).toBe("image/heic");
    expect(mimeFromName("notes")).toBeNull();
  });

  it("treats an iPhone's HEIC as a photo, so it is re-encoded to JPEG rather than refused", () => {
    expect(isImage("image/heic")).toBe(true);
    expect(isImage("application/pdf")).toBe(false);
  });

  it("says sizes the way the website does", () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0MB");
    expect(formatBytes(300 * 1024)).toBe("300KB");
    expect(formatBytes(10)).toBe("1KB");
  });
});
