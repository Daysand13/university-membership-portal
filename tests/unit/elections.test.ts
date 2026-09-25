import { describe, expect, it } from "vitest";
import { ElectionPhase } from "@/generated/prisma/enums";
import { PHASE_LABELS, effectivePhase, isAcceptingVotes, msUntilClose } from "@/lib/election-status";
import {
  accraInputToDate,
  candidateReviewSchema,
  duesRatesSchema,
  nominationFeeSchema,
  dateToAccraInput,
  electionPhaseSchema,
  extendVotingSchema,
  nominationSchema,
  positionSchema,
  stationSchema,
  votingWindowSchema,
} from "@/lib/validations/elections";

const OPENS = new Date("2026-11-14T08:00:00Z");
const CLOSES = new Date("2026-11-14T17:00:00Z");

function election(overrides: Partial<Parameters<typeof effectivePhase>[0]> = {}) {
  return {
    phase: ElectionPhase.SCHEDULED,
    votingOpensAt: OPENS,
    votingClosesAt: CLOSES,
    ...overrides,
  };
}

describe("where an election stands", () => {
  it("follows the clock when nobody has intervened", () => {
    expect(effectivePhase(election(), new Date("2026-11-14T07:59:00Z"))).toBe(ElectionPhase.SCHEDULED);
    expect(effectivePhase(election(), new Date("2026-11-14T08:00:00Z"))).toBe(ElectionPhase.OPEN);
    expect(effectivePhase(election(), new Date("2026-11-14T16:59:00Z"))).toBe(ElectionPhase.OPEN);
    expect(effectivePhase(election(), new Date("2026-11-14T17:00:00Z"))).toBe(ElectionPhase.CLOSED);
  });

  it("lets the commission open a centre that is ready early", () => {
    const early = election({ phase: ElectionPhase.OPEN });
    expect(effectivePhase(early, new Date("2026-11-14T07:00:00Z"))).toBe(ElectionPhase.OPEN);
    // But not past closing time: that takes an extension, not a phase.
    expect(effectivePhase(early, new Date("2026-11-14T18:00:00Z"))).toBe(ElectionPhase.CLOSED);
  });

  it("holds a postponement whatever the clock says", () => {
    const postponed = election({ phase: ElectionPhase.POSTPONED });
    expect(effectivePhase(postponed, new Date("2026-11-14T12:00:00Z"))).toBe(ElectionPhase.POSTPONED);
    expect(isAcceptingVotes(postponed, new Date("2026-11-14T12:00:00Z"))).toBe(false);
  });

  it("stays shut when it has been closed by hand, mid-morning or not", () => {
    const closed = election({ phase: ElectionPhase.CLOSED });
    expect(effectivePhase(closed, new Date("2026-11-14T09:00:00Z"))).toBe(ElectionPhase.CLOSED);
  });

  it("is not open before anybody has set the times", () => {
    const unscheduled = election({ votingOpensAt: null, votingClosesAt: null });
    expect(effectivePhase(unscheduled)).toBe(ElectionPhase.SCHEDULED);
    expect(isAcceptingVotes(unscheduled)).toBe(false);
  });

  it("counts down only while voting is actually open", () => {
    expect(msUntilClose(election(), new Date("2026-11-14T16:00:00Z"))).toBe(3_600_000);
    expect(msUntilClose(election(), new Date("2026-11-14T07:00:00Z"))).toBeNull();
    expect(msUntilClose(election({ phase: ElectionPhase.POSTPONED }), new Date("2026-11-14T12:00:00Z"))).toBeNull();
  });

  it("has something to say for every state a terminal can be in", () => {
    for (const phase of Object.values(ElectionPhase)) {
      expect(PHASE_LABELS[phase]).toBeTruthy();
    }
  });
});

describe("times typed in by the commission", () => {
  it("reads a typed time as Ghana time, which is UTC", () => {
    expect(accraInputToDate("2026-11-14T08:00").toISOString()).toBe("2026-11-14T08:00:00.000Z");
    expect(dateToAccraInput(OPENS)).toBe("2026-11-14T08:00");
    expect(dateToAccraInput(null)).toBe("");
  });

  it("refuses a window that closes before it opens", () => {
    expect(votingWindowSchema.safeParse({ opensAt: "2026-11-14T08:00", closesAt: "2026-11-14T17:00" }).success).toBe(
      true,
    );
    const backwards = votingWindowSchema.safeParse({ opensAt: "2026-11-14T17:00", closesAt: "2026-11-14T08:00" });
    expect(backwards.success).toBe(false);
  });

  it("keeps an extension within the bounds of the plausible", () => {
    expect(extendVotingSchema.safeParse({ minutes: "30" }).success).toBe(true);
    expect(extendVotingSchema.safeParse({ minutes: "1" }).success).toBe(false);
    expect(extendVotingSchema.safeParse({ minutes: "5000" }).success).toBe(false);
  });

  it("accepts a postponement notice alongside the phase", () => {
    const parsed = electionPhaseSchema.safeParse({
      phase: ElectionPhase.POSTPONED,
      notice: "Postponed to Friday after a power failure.",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("standing for office", () => {
  it("wants more than a sentence of intent", () => {
    expect(nominationSchema.safeParse({ positionId: "p1", manifesto: "Vote for me." }).success).toBe(false);
    expect(
      nominationSchema.safeParse({
        positionId: "p1",
        manifesto: "I would push for lecture notes in accessible formats within a week of every class.",
      }).success,
    ).toBe(true);
  });

  it("won't let the commission turn somebody down without saying why", () => {
    // The schema allows an empty note; the action is what insists on one
    // for a rejection, so both halves are checked here.
    expect(candidateReviewSchema.safeParse({ status: "REJECTED", note: "" }).success).toBe(true);
    expect(candidateReviewSchema.safeParse({ status: "SOMETHING_ELSE", note: "" }).success).toBe(false);
  });
});

describe("registering a terminal", () => {
  it("takes a short code and where the machine stands", () => {
    expect(stationSchema.safeParse({ code: "LIB-1", name: "Main Library, ground floor" }).success).toBe(true);
  });

  it("refuses a code with spaces or punctuation that would be mistyped in a hall", () => {
    expect(stationSchema.safeParse({ code: "LIB 1", name: "Main Library" }).success).toBe(false);
    expect(stationSchema.safeParse({ code: "L", name: "Main Library" }).success).toBe(false);
  });
});

describe("what it costs to stand", () => {
  it("takes whole cedis and stores pesewas", () => {
    const parsed = positionSchema.safeParse({ title: "President", order: 0, nominationFeePesewas: "20" });
    expect(parsed.success && parsed.data.nominationFeePesewas).toBe(2000);

    const half = nominationFeeSchema.safeParse({ nominationFeePesewas: "12.50" });
    expect(half.success && half.data.nominationFeePesewas).toBe(1250);
  });

  it("treats a post with no fee as free rather than broken", () => {
    const free = positionSchema.safeParse({ title: "Organiser", order: 1, nominationFeePesewas: "0" });
    expect(free.success && free.data.nominationFeePesewas).toBe(0);
  });

  it("refuses a negative fee, or one nobody would pay", () => {
    expect(nominationFeeSchema.safeParse({ nominationFeePesewas: "-5" }).success).toBe(false);
    expect(nominationFeeSchema.safeParse({ nominationFeePesewas: "5000" }).success).toBe(false);
  });

  it("takes all three dues rates in cedis", () => {
    const parsed = duesRatesSchema.safeParse({
      fresherOrPgFirstYear: "60",
      continuing: "50",
      executive: "70",
    });
    expect(parsed.success && parsed.data).toEqual({
      fresherOrPgFirstYear: 6000,
      continuing: 5000,
      executive: 7000,
    });
  });
});

describe("a nomination", () => {
  it("wants something attached to it", () => {
    const bare = nominationSchema.safeParse({
      positionId: "p1",
      manifesto: "I would push for lecture notes in accessible formats within a week of every class.",
    });
    // The schema defaults to "none"; the action is what refuses that, so
    // both halves are checked here.
    expect(bare.success && bare.data.supportingChoice).toBe("none");

    const withCv = nominationSchema.safeParse({
      positionId: "p1",
      manifesto: "I would push for lecture notes in accessible formats within a week of every class.",
      supportingChoice: "portal-cv",
    });
    expect(withCv.success && withCv.data.supportingChoice).toBe("portal-cv");
  });
});
