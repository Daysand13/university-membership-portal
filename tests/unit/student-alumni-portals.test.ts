import { describe, expect, it } from "vitest";
import {
  barrierReportSchema,
  mentorshipResponseSchema,
  mentorshipSessionSchema,
  supportRequestSchema,
} from "@/lib/validations/student-portal";
import { opportunitySchema } from "@/lib/validations/alumni-portal";
import { adminBroadcastSchema, broadcastSchema } from "@/lib/validations/patron-portal";
import {
  BARRIER_STAGES,
  alumniRank,
  barrierStageIndex,
  barrierStatusLabel,
  isAudioType,
} from "@/lib/portal-options";
import { bytesMatchDeclaredType, sniffAudioMimeType } from "@/lib/storage/validation";
import { barrierEvidenceAccept } from "@/lib/client/file-accept";

/** The first bytes of a file, as the upload service reads them back from storage. */
function head(...bytes: number[]): Uint8Array {
  return new Uint8Array(bytes);
}

describe("reporting a barrier", () => {
  const valid = {
    title: "Lift in the Science block locked again",
    description:
      "The lift was locked for the third week running, so I could not get to the second-floor lecture at all.",
    category: "PHYSICAL_ACCESS",
    location: "Science block",
    occurredOn: "",
  };

  it("accepts a report written in a student's own words", () => {
    expect(barrierReportSchema.safeParse(valid).success).toBe(true);
  });

  it("asks for enough detail to act on, but no more", () => {
    expect(barrierReportSchema.safeParse({ ...valid, title: "Lift" }).success).toBe(false);
    expect(barrierReportSchema.safeParse({ ...valid, description: "Locked." }).success).toBe(false);
    // Location and date are genuinely optional — a student may not remember either.
    expect(barrierReportSchema.safeParse({ ...valid, location: "", occurredOn: "" }).success).toBe(true);
  });

  it("refuses a date in the future", () => {
    const tomorrow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(barrierReportSchema.safeParse({ ...valid, occurredOn: tomorrow }).success).toBe(false);
  });

  it("only accepts the association's own categories", () => {
    expect(barrierReportSchema.safeParse({ ...valid, category: "SOMETHING_ELSE" }).success).toBe(false);
  });
});

describe("the barrier tracker", () => {
  it("names every stage a student can be shown", () => {
    for (const stage of BARRIER_STAGES) {
      expect(barrierStatusLabel(stage.value)).not.toBe(stage.value);
    }
    expect(barrierStatusLabel("CLOSED")).toBe("Closed");
  });

  it("moves forward one step at a time", () => {
    expect(barrierStageIndex("SUBMITTED")).toBe(0);
    expect(barrierStageIndex("UNDER_REVIEW")).toBe(1);
    expect(barrierStageIndex("ESCALATED")).toBe(3);
    expect(barrierStageIndex("RESOLVED")).toBe(BARRIER_STAGES.length - 1);
  });

  it("never claims progress for a report that was closed unresolved", () => {
    // A closed report didn't finish the journey, so it can't sit at the end.
    expect(barrierStageIndex("CLOSED")).toBeLessThan(BARRIER_STAGES.length - 1);
  });
});

describe("asking for support", () => {
  const base = { type: "ASSISTIVE_TECH", details: "A screen reader I can use with the lab computers, please.", amount: "", neededBy: "" };

  it("takes a request that isn't about money without asking for an amount", () => {
    expect(supportRequestSchema.safeParse(base).success).toBe(true);
  });

  it("insists on an amount for welfare, because somebody has to approve a number", () => {
    expect(supportRequestSchema.safeParse({ ...base, type: "WELFARE" }).success).toBe(false);
    expect(supportRequestSchema.safeParse({ ...base, type: "WELFARE", amount: "0" }).success).toBe(false);
    expect(supportRequestSchema.safeParse({ ...base, type: "WELFARE", amount: "450" }).success).toBe(true);
  });

  it("refuses an amount beyond what the fund can consider", () => {
    expect(supportRequestSchema.safeParse({ ...base, type: "WELFARE", amount: "500000" }).success).toBe(false);
  });
});

describe("mentorship", () => {
  it("needs a reason when a mentor declines, so the student can ask someone else", () => {
    expect(mentorshipResponseSchema.safeParse({ decision: "DECLINE", goals: "", declineReason: "" }).success).toBe(false);
    expect(
      mentorshipResponseSchema.safeParse({ decision: "DECLINE", goals: "", declineReason: "Travelling this term." })
        .success,
    ).toBe(true);
  });

  it("accepts without demanding goals be written down", () => {
    expect(mentorshipResponseSchema.safeParse({ decision: "ACCEPT", goals: "", declineReason: "" }).success).toBe(true);
  });

  it("only books sessions in the future", () => {
    const past = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const soon = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);
    expect(mentorshipSessionSchema.safeParse({ scheduledFor: past, topic: "" }).success).toBe(false);
    expect(mentorshipSessionSchema.safeParse({ scheduledFor: soon, topic: "" }).success).toBe(true);
  });
});

describe("the opportunity board", () => {
  const valid = {
    title: "Junior Accessibility Analyst",
    organization: "Ghana Digital Access",
    type: "JOB",
    location: "Accra",
    description: "Reviewing public services for accessibility. Training given; no prior experience needed.",
    applyUrl: "https://example.org/jobs/1",
    applyEmail: "",
    closingDate: "",
  };

  it("accepts a posting with a link", () => {
    expect(opportunitySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a posting with only an email address", () => {
    expect(opportunitySchema.safeParse({ ...valid, applyUrl: "", applyEmail: "jobs@example.org" }).success).toBe(true);
  });

  it("refuses a posting nobody can apply to", () => {
    expect(opportunitySchema.safeParse({ ...valid, applyUrl: "", applyEmail: "" }).success).toBe(false);
  });

  it("refuses a half-written link", () => {
    expect(opportunitySchema.safeParse({ ...valid, applyUrl: "example.org/jobs" }).success).toBe(false);
  });
});

describe("who may broadcast to whom", () => {
  const body = { subject: "Semester general meeting", bodyHtml: "<p>Friday, 4pm.</p>", sendEmail: true, postToPortal: true };

  it("lets an executive write to the patrons", () => {
    expect(adminBroadcastSchema.safeParse({ ...body, audience: "PATRONS", authorName: "The President" }).success).toBe(
      true,
    );
  });

  it("does not let a patron write to the patrons", () => {
    // Patrons address the association's members; writing to each other is an
    // executive's job.
    expect(broadcastSchema.safeParse({ ...body, audience: "PATRONS" }).success).toBe(false);
    expect(broadcastSchema.safeParse({ ...body, audience: "STUDENTS" }).success).toBe(true);
  });

  it("makes an executive say who the message is from", () => {
    expect(adminBroadcastSchema.safeParse({ ...body, audience: "STUDENTS", authorName: "" }).success).toBe(false);
  });
});

describe("a voice note as evidence", () => {
  it("recognises the recording formats a phone produces", () => {
    expect(sniffAudioMimeType(head(0x49, 0x44, 0x33, 0x04))).toBe("audio/mpeg"); // ID3
    expect(sniffAudioMimeType(head(0xff, 0xfb, 0x90, 0x00))).toBe("audio/mpeg"); // frame sync
    expect(sniffAudioMimeType(head(0x4f, 0x67, 0x67, 0x53))).toBe("audio/ogg"); // OggS
    expect(sniffAudioMimeType(head(0x1a, 0x45, 0xdf, 0xa3))).toBe("audio/webm"); // EBML
    expect(
      sniffAudioMimeType(head(0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20)),
    ).toBe("audio/mp4"); // ftyp
    expect(
      sniffAudioMimeType(head(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45)),
    ).toBe("audio/wav"); // RIFF…WAVE
  });

  it("accepts a recording whose container and declared type differ, as phones label them", () => {
    // An m4a from an Android recorder often arrives declared as audio/mp4
    // while sniffing as an ISO container — that has to pass.
    const m4a = head(0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20);
    expect(bytesMatchDeclaredType(m4a, "audio/mp4")).toBe(true);
    expect(bytesMatchDeclaredType(m4a, "audio/mpeg")).toBe(true);
  });

  it("refuses a file claiming to be a recording that isn't one", () => {
    const text = head(0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0x0a, 0x00);
    expect(bytesMatchDeclaredType(text, "audio/mpeg")).toBe(false);
  });

  it("still holds images and documents to their own signatures", () => {
    const pdf = head(0x25, 0x50, 0x44, 0x46, 0x2d);
    expect(bytesMatchDeclaredType(pdf, "application/pdf")).toBe(true);
    expect(bytesMatchDeclaredType(pdf, "image/png")).toBe(false);
  });

  it("knows a recording from a photo when labelling an attachment", () => {
    expect(isAudioType("audio/mpeg")).toBe(true);
    expect(isAudioType("image/jpeg")).toBe(false);
  });

  it("offers Android a picker it can actually reach the file browser from", () => {
    // Naming an image or audio type on Android opens the "Choose an action"
    // sheet, which on Samsung has no route to My Files (see file-accept.ts).
    const android = barrierEvidenceAccept(true);
    expect(android).toContain("application/octet-stream");
    expect(android).not.toContain("image/");
    expect(android).not.toContain("audio/");

    const others = barrierEvidenceAccept(false);
    expect(others).toContain("image/jpeg");
    expect(others).toContain("audio/mpeg");
  });
});

describe("what a graduate's standing is called", () => {
  it("starts everyone as a graduate, with a way up", () => {
    const rank = alumniRank({ activeMentees: 0, lifetimeGivingPesewas: 0, endorsements: 0 });
    expect(rank.label).toBe("Graduate");
    expect(rank.detail).toMatch(/Ally/);
  });

  it("counts giving time the same as giving money", () => {
    expect(alumniRank({ activeMentees: 1, lifetimeGivingPesewas: 0, endorsements: 0 }).label).toBe("Ally");
    expect(alumniRank({ activeMentees: 0, lifetimeGivingPesewas: 50_000, endorsements: 0 }).label).toBe("Ally");
  });

  it("recognises sustained support", () => {
    expect(alumniRank({ activeMentees: 3, lifetimeGivingPesewas: 0, endorsements: 0 }).label).toBe("Champion");
    expect(alumniRank({ activeMentees: 0, lifetimeGivingPesewas: 200_000, endorsements: 0 }).label).toBe("Champion");
  });

  it("counts backing a campaign as support, even with nothing given", () => {
    expect(alumniRank({ activeMentees: 0, lifetimeGivingPesewas: 0, endorsements: 2 }).label).toBe("Supporter");
  });
});
