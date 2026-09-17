import { describe, expect, it } from "vitest";
import {
  broadcastReviewSchema,
  broadcastSchema,
  cedisToPesewas,
  donationSchema,
  expenseSchema,
  issueActionSchema,
} from "@/lib/validations/patron-portal";
import { columnPath, niceScale } from "@/components/charts/chart-utils";
import { formatCedis } from "@/lib/patron-portal-options";
import { APPLICANT_UPLOAD_KINDS, parseEnrollmentTicketRequest } from "@/lib/services/enrollment-upload-service";

describe("donation form", () => {
  it("accepts a preset or typed amount, with commas", () => {
    const parsed = donationSchema.parse({ amount: "1,250.50", fund: "EMERGENCY_WELFARE", anonymous: false });
    expect(parsed.amount).toBe(1250.5);
    expect(cedisToPesewas(parsed.amount)).toBe(125050);
  });

  it("refuses amounts that are too small, too large, too precise or not numbers", () => {
    for (const amount of ["0", "0.5", "100001", "10.555", "abc", ""]) {
      expect(donationSchema.safeParse({ amount, fund: "GENERAL", anonymous: false }).success, amount).toBe(false);
    }
  });

  it("only accepts the listed causes", () => {
    expect(donationSchema.safeParse({ amount: "50", fund: "HOLIDAYS", anonymous: false }).success).toBe(false);
  });

  it("converts cedis to pesewas without floating-point drift", () => {
    expect(cedisToPesewas(19.99)).toBe(1999);
    expect(cedisToPesewas(0.29)).toBe(29);
  });
});

describe("broadcast form", () => {
  const valid = {
    audience: "STUDENTS",
    subject: "Scholarship briefing",
    bodyHtml: "<p>Details inside.</p>",
    sendEmail: true,
    postToPortal: false,
  };

  it("accepts a complete broadcast", () => {
    expect(broadcastSchema.safeParse(valid).success).toBe(true);
  });

  it("needs at least one way to send it", () => {
    const result = broadcastSchema.safeParse({ ...valid, sendEmail: false, postToPortal: false });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.sendEmail).toBeTruthy();
  });

  it("treats an editor with only empty tags as an empty message", () => {
    expect(broadcastSchema.safeParse({ ...valid, bodyHtml: "<p></p><p>&nbsp;</p>" }).success).toBe(false);
  });

  it("requires a reason to decline, but not to approve", () => {
    expect(broadcastReviewSchema.safeParse({ decision: "APPROVE", note: "" }).success).toBe(true);
    expect(broadcastReviewSchema.safeParse({ decision: "REJECT", note: "  " }).success).toBe(false);
    expect(broadcastReviewSchema.safeParse({ decision: "REJECT", note: "Please shorten it." }).success).toBe(true);
  });
});

describe("admin finance and advocacy forms", () => {
  it("refuses an expense dated in the future", () => {
    const nextYear = `${new Date().getUTCFullYear() + 1}-01-15`;
    expect(expenseSchema.safeParse({ category: "EVENTS", description: "Hall hire", amount: "300", spentOn: nextYear }).success).toBe(false);
    expect(expenseSchema.safeParse({ category: "EVENTS", description: "Hall hire", amount: "300", spentOn: "2026-01-15" }).success).toBe(true);
  });

  it("asks for more than a word on an issue action", () => {
    expect(issueActionSchema.safeParse({ type: "MEETING_REQUEST", message: "Soon" }).success).toBe(false);
    expect(issueActionSchema.safeParse({ type: "MEETING_REQUEST", message: "Any weekday morning next week." }).success).toBe(true);
  });
});

describe("chart helpers", () => {
  it("rounds the axis up to a clean number", () => {
    expect(niceScale(870)).toEqual({ max: 1000, ticks: [0, 250, 500, 750, 1000] });
    expect(niceScale(0).max).toBeGreaterThan(0);
    expect(niceScale(3, { integer: true }).ticks.every(Number.isInteger)).toBe(true);
  });

  it("draws nothing for an empty column", () => {
    expect(columnPath(0, 0, 20, 0)).toBe("");
    expect(columnPath(0, 0, 20, 50)).toMatch(/^M0,50/);
  });

  it("formats cedis", () => {
    expect(formatCedis(125050)).toBe("GH₵ 1,250.50");
    expect(formatCedis(500000)).toBe("GH₵ 5,000");
  });
});

describe("upload ticket requests", () => {
  const body = { kind: "patron-document", filename: "letter.pdf", mimeType: "application/pdf", fileSize: 1000 };

  it("keeps patron documents out of the public enrollment routes", () => {
    expect(parseEnrollmentTicketRequest(body)).toBeNull();
    expect(parseEnrollmentTicketRequest(body, APPLICANT_UPLOAD_KINDS)).toBeNull();
  });

  it("allows them where the route opts in", () => {
    expect(parseEnrollmentTicketRequest(body, ["patron-document"])?.kind).toBe("patron-document");
    expect(parseEnrollmentTicketRequest({ ...body, kind: "medical" }, ["patron-document"])).toBeNull();
  });
});
