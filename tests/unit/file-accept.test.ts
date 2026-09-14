import { describe, expect, it } from "vitest";
import {
  isAndroidDevice,
  medicalReportAccept,
  medicalReportFileProblem,
  MEDICAL_REPORT_ACCEPT_ANDROID,
  MEDICAL_REPORT_ACCEPT_OTHER,
} from "@/lib/client/file-accept";

const SAMSUNG_CHROME =
  "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36";
const SAMSUNG_INTERNET =
  "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36";
const ANDROID_DESKTOP_SITE = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
const CHROMEBOOK = "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

/** The types Chrome on Android would see once extensions are mapped. */
function types(accept: string) {
  return accept.split(",").filter((t) => t.includes("/"));
}

describe("isAndroidDevice", () => {
  it("recognises Android phones in Chrome and Samsung Internet", () => {
    expect(isAndroidDevice({ userAgent: SAMSUNG_CHROME })).toBe(true);
    expect(isAndroidDevice({ userAgent: SAMSUNG_INTERNET })).toBe(true);
    expect(isAndroidDevice({ userAgent: "", userAgentData: { platform: "Android" } })).toBe(true);
  });

  it("still recognises a phone showing the desktop version of the site", () => {
    expect(isAndroidDevice({ userAgent: ANDROID_DESKTOP_SITE, maxTouchPoints: 5 })).toBe(true);
  });

  it("does not treat iPhones, Windows PCs or Chromebooks as Android", () => {
    expect(isAndroidDevice({ userAgent: IPHONE, maxTouchPoints: 5 })).toBe(false);
    expect(isAndroidDevice({ userAgent: WINDOWS, maxTouchPoints: 0 })).toBe(false);
    expect(isAndroidDevice({ userAgent: CHROMEBOOK, maxTouchPoints: 10 })).toBe(false);
    expect(isAndroidDevice(undefined)).toBe(false);
  });
});

describe("medical report accept list", () => {
  it("names no image type on Android, so Chrome opens the file browser instead of the camera sheet", () => {
    expect(types(medicalReportAccept(true)).some((t) => t.startsWith("image/"))).toBe(false);
    expect(medicalReportAccept(true)).not.toContain("*");
  });

  it("includes application/octet-stream on Android, so photos aren't filtered out of the file browser", () => {
    expect(types(MEDICAL_REPORT_ACCEPT_ANDROID)).toContain("application/octet-stream");
  });

  it("keeps PDFs and Word files first on every platform", () => {
    for (const accept of [MEDICAL_REPORT_ACCEPT_ANDROID, MEDICAL_REPORT_ACCEPT_OTHER]) {
      expect(accept.split(",")[0]).toBe("application/pdf");
      expect(accept).toContain(".docx");
    }
  });

  it("offers photos alongside documents on iPhones and computers", () => {
    expect(medicalReportAccept(false)).toContain("image/jpeg");
    expect(medicalReportAccept(false)).toContain("image/png");
  });
});

describe("medicalReportFileProblem", () => {
  const file = (name: string, size = 1000) => ({ name, size });

  it("accepts PDFs, Word files and JPG/PNG photos", () => {
    expect(medicalReportFileProblem(file("report.pdf"), "application/pdf")).toBeNull();
    expect(medicalReportFileProblem(file("report.docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBeNull();
    expect(medicalReportFileProblem(file("IMG_2041.jpg"), "image/jpeg")).toBeNull();
  });

  it("explains a HEIC photo specifically", () => {
    expect(medicalReportFileProblem(file("IMG_2041.HEIC"), "image/heic")).toContain("HEIC");
  });

  it("refuses other file types and empty files with a clear reason", () => {
    expect(medicalReportFileProblem(file("results.xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toContain(
      "PDF",
    );
    expect(medicalReportFileProblem(file("report.pdf", 0), "application/pdf")).toContain("empty");
  });

  it("leaves a file with no detectable type for the server to check", () => {
    expect(medicalReportFileProblem(file("scan"), "")).toBeNull();
  });
});
