import { describe, expect, it } from "vitest";
import { PaidDocumentKind } from "@/generated/prisma/enums";
import { cvFromRecord, cvHasSubstance, cvSchema, EMPTY_CV } from "@/lib/validations/cv";
import { DOCUMENT_PRICES, formatCedis, isDocumentPurchaseReference, priceOf } from "@/lib/services/document-purchase-service";

describe("what a member types into their CV", () => {
  it("accepts a first-year with nothing but a profile", () => {
    const parsed = cvSchema.safeParse({
      ...EMPTY_CV,
      summary: "First-year special education student looking for a teaching attachment.",
    });
    expect(parsed.success).toBe(true);
  });

  it("wants a name on a school and a role on a job", () => {
    expect(cvSchema.safeParse({ ...EMPTY_CV, education: [{ institution: "" }] }).success).toBe(false);
    expect(cvSchema.safeParse({ ...EMPTY_CV, experience: [{ role: "" }] }).success).toBe(false);
    expect(
      cvSchema.safeParse({ ...EMPTY_CV, education: [{ institution: "Winneba SHS", period: "2018 – 2021" }] }).success,
    ).toBe(true);
  });

  it("catches a referee's email that would bounce", () => {
    const bad = cvSchema.safeParse({ ...EMPTY_CV, referees: [{ name: "Dr Mensah", email: "not-an-address" }] });
    expect(bad.success).toBe(false);
  });

  it("keeps what it can when a stored row has drifted", () => {
    // A column written before a field existed, or half-edited by hand:
    // the page somebody is trying to fix must still open.
    const recovered = cvFromRecord({
      headline: "Student teacher",
      education: [{ institution: "Winneba SHS" }, { nonsense: true }],
      experience: "not a list",
      skills: [{ label: "Braille", note: "Confident" }],
    });
    expect(recovered.headline).toBe("Student teacher");
    expect(recovered.education).toHaveLength(1);
    expect(recovered.experience).toEqual([]);
    expect(recovered.skills[0].label).toBe("Braille");
  });

  it("knows the difference between an empty CV and one worth printing", () => {
    expect(cvHasSubstance(EMPTY_CV)).toBe(false);
    expect(cvHasSubstance({ ...EMPTY_CV, headline: "Final-year student" })).toBe(true);
    expect(cvHasSubstance({ ...EMPTY_CV, education: [{ institution: "Winneba SHS" }] })).toBe(true);
  });
});

describe("paying for a document", () => {
  it("prices every kind of document there is", () => {
    for (const kind of Object.values(PaidDocumentKind)) {
      const price = priceOf(kind);
      expect(price.pesewas).toBeGreaterThan(0);
      expect(price.label).toBeTruthy();
    }
  });

  it("states money in cedis, never in pesewas", () => {
    expect(formatCedis(DOCUMENT_PRICES.CV.pesewas)).toBe("GH₵20.00");
    expect(formatCedis(2550)).toBe("GH₵25.50");
  });

  it("tells a document payment apart from dues and donations at the webhook", () => {
    // All three come back through the one Paystack account.
    expect(isDocumentPurchaseReference("doc-cv-8f14e45f")).toBe(true);
    expect(isDocumentPurchaseReference("dues-8f14e45f")).toBe(false);
    expect(isDocumentPurchaseReference("don-8f14e45f")).toBe(false);
  });
});
