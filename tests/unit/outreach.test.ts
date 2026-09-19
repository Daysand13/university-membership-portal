import { describe, expect, it } from "vitest";
import {
  allyListingSchema,
  allySignupSchema,
  priorProgrammeSchema,
  publicDonationSchema,
  softwareListingSchema,
  softwareRequestSchema,
} from "@/lib/validations/outreach";
import { adminBroadcastSchema } from "@/lib/validations/patron-portal";
import { isPublicGivingReturn, PUBLIC_GIVING_RETURN_PATHS } from "@/lib/services/public-giving-service";
import {
  graduationFromPriorProgrammes,
  qualifiesForPriorProgrammes,
  sameProgramme,
} from "@/lib/services/alumni-prior-programme-service";
import { patronBroadcastEmail } from "@/lib/email/templates";

const brand = { siteTitle: "Association of Students with Special Needs", logoUrl: null, universityLogoUrl: null };

describe("joining the ally network", () => {
  const valid = { fullName: "Efua Asante", email: "Efua@Example.org", type: "INDIVIDUAL", organization: "", wantsListing: false };

  it("needs only a name, an email and how they're joining", () => {
    const parsed = allySignupSchema.parse(valid);
    // Stored lower-case, so the same person can't join twice by capitalising.
    expect(parsed.email).toBe("efua@example.org");
  });

  it("refuses an address that isn't one", () => {
    expect(allySignupSchema.safeParse({ ...valid, email: "efua@" }).success).toBe(false);
  });

  it("accepts a corporate representative with their organisation", () => {
    expect(
      allySignupSchema.safeParse({ ...valid, type: "CORPORATE", organization: "Ghana Digital Access", wantsListing: true }).success,
    ).toBe(true);
  });
});

describe("giving without an account", () => {
  const valid = { donorName: "Kojo Mensah", donorEmail: "kojo@example.org", amount: "250", fund: "ASSISTIVE_TECHNOLOGY" };

  it("takes a name, an email for the receipt, an amount and a fund", () => {
    expect(publicDonationSchema.parse(valid).amount).toBe(250);
  });

  it("insists on an email, because that's where the receipt goes", () => {
    expect(publicDonationSchema.safeParse({ ...valid, donorEmail: "" }).success).toBe(false);
  });

  it("refuses amounts outside what the form allows", () => {
    for (const amount of ["0", "abc", "100001", "10.555"]) {
      expect(publicDonationSchema.safeParse({ ...valid, amount }).success, amount).toBe(false);
    }
  });

  it("only sends donors back to a fixed list of pages", () => {
    expect(isPublicGivingReturn("allies")).toBe(true);
    expect(isPublicGivingReturn("assistive-technology")).toBe(true);
    // Anything else — including an attempt at an outside address — isn't a page we send people to.
    for (const bad of ["https://evil.example", "//evil.example", "../admin", "constructor", "", null]) {
      expect(isPublicGivingReturn(bad), String(bad)).toBe(false);
    }
    for (const path of Object.values(PUBLIC_GIVING_RETURN_PATHS)) {
      expect(path.startsWith("/")).toBe(true);
    }
  });
});

describe("asking for software", () => {
  const valid = {
    fullName: "Ama Owusu",
    email: "ama@example.org",
    softwareName: "NVDA",
    category: "VISION",
    operatingSystem: "Windows",
    notes: "",
  };

  it("accepts a complete request", () => {
    expect(softwareRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("needs to know what it's for and what it runs on", () => {
    expect(softwareRequestSchema.safeParse({ ...valid, category: "" }).success).toBe(false);
    expect(softwareRequestSchema.safeParse({ ...valid, operatingSystem: "BeOS" }).success).toBe(false);
  });
});

describe("the software directory", () => {
  const valid = {
    name: "NVDA",
    logoUrl: "",
    category: "VISION",
    platforms: ["WINDOWS"],
    description: "A free, open-source screen reader for Windows.",
    isFree: true,
    telegramUrl: "",
    websiteUrl: "https://www.nvaccess.org",
    order: "0",
    isActive: true,
  };

  it("accepts a listing", () => {
    expect(softwareListingSchema.safeParse(valid).success).toBe(true);
  });

  it("needs at least one platform, so the card can say where it runs", () => {
    expect(softwareListingSchema.safeParse({ ...valid, platforms: [] }).success).toBe(false);
  });

  it("refuses a link that isn't a web address", () => {
    expect(softwareListingSchema.safeParse({ ...valid, telegramUrl: "t.me/library" }).success).toBe(false);
    expect(softwareListingSchema.safeParse({ ...valid, telegramUrl: "https://t.me/library" }).success).toBe(true);
  });
});

describe("an ally's listing", () => {
  const base = {
    type: "INDIVIDUAL",
    name: "Dr. Yaw Boateng",
    imageUrl: "",
    role: "Senior Policy Advisor",
    organization: "Accessibility Division",
    sector: "",
    statement: "Access is a right, not a favour.",
    spotlightQuote: "",
    featured: false,
    websiteUrl: "",
    order: "0",
    isActive: true,
  };

  it("accepts a listing without a spotlight", () => {
    expect(allyListingSchema.safeParse(base).success).toBe(true);
  });

  it("won't feature someone in the spotlight without their quote", () => {
    expect(allyListingSchema.safeParse({ ...base, featured: true }).success).toBe(false);
    expect(allyListingSchema.safeParse({ ...base, featured: true, spotlightQuote: "Because it matters." }).success).toBe(true);
  });
});

describe("broadcasting to the ally network", () => {
  const base = { authorName: "The President", subject: "Campaign update", bodyHtml: "<p>News.</p>", sendEmail: true, postToPortal: true };

  it("reaches allies by email only — they have no portal", () => {
    const parsed = adminBroadcastSchema.parse({ ...base, audience: "ALLIES" });
    expect(parsed.postToPortal).toBe(false);
    expect(parsed.sendEmail).toBe(true);
  });

  it("refuses a portal-only broadcast to allies", () => {
    expect(adminBroadcastSchema.safeParse({ ...base, audience: "ALLIES", sendEmail: false }).success).toBe(false);
  });

  it("leaves other audiences as they were", () => {
    expect(adminBroadcastSchema.parse({ ...base, audience: "STUDENTS" }).postToPortal).toBe(true);
  });
});

describe("the broadcast email", () => {
  const common = {
    firstName: "Esi",
    subject: "Semester meeting",
    bodyHtml: "<p>Friday at 4pm.</p>",
    authorName: "Kwame Asare",
    audienceLabel: "Enrolled Students",
    brand,
  };

  it("introduces an executive's message as the executive committee's, never a patron's", () => {
    const { html } = patronBroadcastEmail({ ...common, sender: "executive" });
    expect(html).toContain("Message from the Executive Committee");
    expect(html).not.toContain("Message from a Patron");
    expect(html).not.toContain("Patron, ");
    // An executive's broadcast isn't approved by anyone, so it mustn't say it was.
    expect(html).not.toContain("reviewed and approved");
  });

  it("still introduces a patron's message as a patron's", () => {
    const { html } = patronBroadcastEmail({ ...common, sender: "patron" });
    expect(html).toContain("Message from a Patron");
    expect(html).toContain("reviewed and approved");
  });

  it("gives allies a way out of the list in every email", () => {
    const { html } = patronBroadcastEmail({
      ...common,
      sender: "executive",
      unsubscribeUrl: "https://www.assnuew.com/allies/unsubscribe/abc123",
    });
    expect(html).toContain("https://www.assnuew.com/allies/unsubscribe/abc123");
    expect(html).toContain("Unsubscribe");
  });
});

describe("undergraduate programmes for postgraduate alumni", () => {
  it("is offered to someone with postgraduate study on record", () => {
    expect(qualifiesForPriorProgrammes({ recordTracks: ["POSTGRADUATE"], applications: [] })).toBe(true);
  });

  it("is offered to someone whose postgraduate application is in progress or approved", () => {
    expect(
      qualifiesForPriorProgrammes({ recordTracks: [], applications: [{ track: "POSTGRADUATE", status: "PENDING" }] }),
    ).toBe(true);
    expect(
      qualifiesForPriorProgrammes({ recordTracks: [], applications: [{ track: "POSTGRADUATE", status: "APPROVED" }] }),
    ).toBe(true);
  });

  it("isn't offered on the strength of a rejected application, or undergraduate study alone", () => {
    expect(
      qualifiesForPriorProgrammes({ recordTracks: [], applications: [{ track: "POSTGRADUATE", status: "REJECTED" }] }),
    ).toBe(false);
    expect(qualifiesForPriorProgrammes({ recordTracks: ["UNDERGRADUATE", null], applications: [] })).toBe(false);
  });

  it("checks the programme they add", () => {
    const valid = { qualification: "Bachelor's degree", programme: "B.Ed. Special Education", institution: "UEW", yearCompleted: "2019" };
    expect(priorProgrammeSchema.safeParse(valid).success).toBe(true);
    expect(priorProgrammeSchema.safeParse({ ...valid, yearCompleted: "" }).success).toBe(true);
    expect(priorProgrammeSchema.safeParse({ ...valid, yearCompleted: "19" }).success).toBe(false);
    expect(priorProgrammeSchema.safeParse({ ...valid, yearCompleted: String(new Date().getFullYear() + 1) }).success).toBe(false);
    expect(priorProgrammeSchema.safeParse({ ...valid, qualification: "PhD" }).success).toBe(false);
  });
});

describe("the programmes an alumnus lists, on their public profile", () => {
  const mphil = { inProgress: ["MPhil Special Education"], completed: [] };
  const bed = { programme: "B.Ed special Education", yearCompleted: 2023, createdAt: new Date("2026-09-19") };

  it("replaces a postgraduate programme still in progress with the undergraduate one they graduated in", () => {
    expect(
      graduationFromPriorProgrammes({
        profile: { programme: "MPhil Special Education", graduationYear: 2026 },
        study: mphil,
        priorProgrammes: [bed],
      }),
    ).toEqual({ programme: "B.Ed special Education", graduationYear: 2023 });
  });

  it("follows the most recently completed one, and keeps the class year when none is given", () => {
    const diploma = { programme: "Diploma in Basic Education", yearCompleted: 2019, createdAt: new Date("2026-09-20") };
    expect(
      graduationFromPriorProgrammes({
        profile: { programme: "B.Ed special Education", graduationYear: 2023 },
        study: mphil,
        priorProgrammes: [diploma, bed],
      }),
    ).toBeNull();
    expect(
      graduationFromPriorProgrammes({
        profile: { programme: "MPhil Special Education", graduationYear: 2023 },
        study: mphil,
        priorProgrammes: [{ ...bed, yearCompleted: null }],
      }),
    ).toEqual({ programme: "B.Ed special Education", graduationYear: 2023 });
  });

  it("goes back to where it started when the list is emptied, so adding again picks it up", () => {
    expect(
      graduationFromPriorProgrammes({
        profile: { programme: "B.Ed special Education", graduationYear: 2023 },
        study: mphil,
        priorProgrammes: [],
        removedProgramme: "B.Ed special Education",
      }),
    ).toEqual({ programme: "MPhil Special Education", graduationYear: 2023 });
  });

  it("leaves alone a profile naming a programme they completed with the association", () => {
    expect(
      graduationFromPriorProgrammes({
        profile: { programme: "B.Ed Special Education", graduationYear: 2020 },
        study: { inProgress: ["MPhil Special Education"], completed: ["B.Ed Special Education"] },
        priorProgrammes: [{ ...bed, yearCompleted: 2021 }],
      }),
    ).toBeNull();
    expect(
      graduationFromPriorProgrammes({
        profile: { programme: "B.A. Sign Language", graduationYear: 2018 },
        study: mphil,
        priorProgrammes: [bed],
      }),
    ).toBeNull();
  });

  it("treats spelling and punctuation differences as the same programme", () => {
    expect(sameProgramme("B.Ed special Education", "BEd Special Education")).toBe(true);
    expect(sameProgramme("B.Ed Special Education", "B.Ed Mathematics")).toBe(false);
  });
});
