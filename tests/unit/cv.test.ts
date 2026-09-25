import { describe, expect, it } from "vitest";
import { PaidDocumentKind, SignatureKind } from "@/generated/prisma/enums";
import {
  cvFromRecord,
  cvHasSubstance,
  cvSchema,
  EMPTY_CV,
  monthLabel,
  newestFirst,
  periodLabel,
} from "@/lib/validations/cv";
import {
  DOCUMENT_PRICES,
  formatCedis,
  isDocumentPurchaseReference,
  priceDescription,
  priceOf,
  validUntilFor,
} from "@/lib/services/document-purchase-service";

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
    expect(cvHasSubstance({ ...EMPTY_CV, education: [{ institution: "Winneba SHS", current: false }] })).toBe(true);
  });
});

describe("paying for a document", () => {
  it("names every kind of document there is", () => {
    for (const kind of Object.values(PaidDocumentKind)) {
      expect(priceOf(kind).label).toBeTruthy();
    }
  });

  it("prices the documents the association sets one price for", () => {
    expect(priceOf(PaidDocumentKind.CV).pesewas).toBeGreaterThan(0);
    expect(priceOf(PaidDocumentKind.ID_CARD).pesewas).toBeGreaterThan(0);
    // A nomination form has no single price: the commission sets one per
    // post, so this is only the fallback for a post nobody has priced.
    expect(priceOf(PaidDocumentKind.NOMINATION_FORM).pesewas).toBe(0);
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

describe("dates on a CV", () => {
  it("shows a picked month the way a person writes it", () => {
    expect(monthLabel("2021-09")).toBe("Sep 2021");
    expect(monthLabel("")).toBe("");
    // Anything an earlier version stored as free text is left alone.
    expect(monthLabel("Sept 2021")).toBe("Sept 2021");
  });

  it("says 'present' for whatever is still going on", () => {
    expect(periodLabel({ startMonth: "2024-06", current: true })).toBe("Jun 2024 – present");
    expect(periodLabel({ startMonth: "2018-09", endMonth: "2021-06" })).toBe("Sep 2018 – Jun 2021");
    expect(periodLabel({ startMonth: "2021-01" })).toBe("Jan 2021");
    expect(periodLabel({ period: "2018 – 2021" })).toBe("2018 – 2021");
    expect(periodLabel({})).toBe("");
  });

  it("puts the newest first, with anything ongoing above it all", () => {
    const rows = [
      { role: "Oldest", startMonth: "2019-01", endMonth: "2020-01" },
      { role: "Still going", startMonth: "2023-01", current: true },
      { role: "Most recent finished", startMonth: "2022-01", endMonth: "2022-12" },
    ];
    expect(newestFirst(rows).map((r) => r.role)).toEqual(["Still going", "Most recent finished", "Oldest"]);
  });

  it("leaves undated rows where they were typed, at the bottom", () => {
    const rows = [
      { role: "No dates one" },
      { role: "Dated", startMonth: "2022-01", endMonth: "2022-12" },
      { role: "No dates two" },
    ];
    expect(newestFirst(rows).map((r) => r.role)).toEqual(["Dated", "No dates one", "No dates two"]);
  });

  it("refuses a stretch of time that finishes before it starts", () => {
    const backwards = cvSchema.safeParse({
      ...EMPTY_CV,
      experience: [{ role: "Tutor", startMonth: "2024-06", endMonth: "2023-01" }],
    });
    expect(backwards.success).toBe(false);
    // Unless it hasn't finished, in which case the end date is nobody's business.
    const ongoing = cvSchema.safeParse({
      ...EMPTY_CV,
      experience: [{ role: "Tutor", startMonth: "2024-06", endMonth: "", current: true }],
    });
    expect(ongoing.success).toBe(true);
  });
});

describe("signing a CV", () => {
  it("takes typed initials as a signature in their own right", () => {
    const typed = cvSchema.safeParse({ ...EMPTY_CV, signatureKind: SignatureKind.TYPED, signatureData: "E.N" });
    expect(typed.success).toBe(true);
  });

  it("takes a drawn one", () => {
    const drawn = cvSchema.safeParse({
      ...EMPTY_CV,
      signatureKind: SignatureKind.DRAWN,
      signatureData: "data:image/png;base64,iVBORw0KGgo=",
    });
    expect(drawn.success).toBe(true);
  });

  it("won't accept a choice to sign with nothing to sign with", () => {
    const empty = cvSchema.safeParse({ ...EMPTY_CV, signatureKind: SignatureKind.TYPED, signatureData: "" });
    expect(empty.success).toBe(false);
  });

  it("keeps typed initials to initials", () => {
    const essay = cvSchema.safeParse({
      ...EMPTY_CV,
      signatureKind: SignatureKind.TYPED,
      signatureData: "I hereby certify that everything written above is true and correct in every particular",
    });
    expect(essay.success).toBe(false);
  });

  it("lets somebody leave it unsigned", () => {
    expect(cvSchema.safeParse({ ...EMPTY_CV }).success).toBe(true);
  });
});

describe("what a graduate pays", () => {
  const member = { kind: "member" as const, id: "m1", email: "a@b.c" };
  const alumnus = { kind: "alumni" as const, id: "a1", email: "a@b.c" };

  it("charges a student once and a graduate every year", () => {
    expect(validUntilFor(member, PaidDocumentKind.CV)).toBeNull();

    const from = new Date("2026-09-25T10:00:00Z");
    const until = validUntilFor(alumnus, PaidDocumentKind.CV, from);
    expect(until).not.toBeNull();
    expect(until!.getUTCFullYear()).toBe(2027);
    expect(until!.getUTCMonth()).toBe(8);
  });

  it("says which it is before anybody pays", () => {
    expect(priceDescription("member", PaidDocumentKind.CV)).toBe("GH₵20.00, once");
    expect(priceDescription("alumni", PaidDocumentKind.CV)).toBe("GH₵20.00 a year");
  });

  it("charges a graduate the same money as a student", () => {
    expect(DOCUMENT_PRICES.CV.pesewas).toBe(2000);
  });
});
