import { describe, expect, it } from "vitest";
import { renderDuesReceiptBuffer, type DuesReceiptData } from "@/lib/pdf/DuesReceiptPdf";

const base: DuesReceiptData = {
  reference: "CASH-ABC123DEF456",
  paidAt: new Date("2026-09-13T10:00:00Z"),
  memberName: "Ama Serwaa Mensah",
  indexNumber: "5211040123",
  programme: "BEd Special Education",
  level: "Level 200",
  academicYear: "2026/2027",
  tierLabel: "Level 200",
  amountLabel: "GHS 50.00",
  method: "cash",
  transactionId: null,
  logoDataUri: null,
  universityLogoDataUri: null,
  website: "www.assnuew.com",
  generatedAt: new Date("2026-09-13T10:00:05Z"),
};

describe("renderDuesReceiptBuffer", () => {
  it("renders a one-page PDF for a cash payment, with or without logos", async () => {
    const pdf = await renderDuesReceiptBuffer(base);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1")).toMatch(/\/Count 1\b/);
  }, 30_000);

  it("renders an online payment with its Paystack transaction ID", async () => {
    const pdf = await renderDuesReceiptBuffer({ ...base, reference: "dues-9f2c", method: "online", transactionId: "4812276613" });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);
});
