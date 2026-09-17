import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Who counts as a current member has to mean the same thing on every
 * screen. These pin the rule down: the roll is "hasn't graduated", so an
 * alumnus who enrolled again is on it, and a member who has graduated is
 * not — whichever of their records still carries the alumni link.
 */
type Query = { where: Record<string, unknown> };

const mocks = vi.hoisted(() => ({
  db: {
    member: {
      count: vi.fn<(args: { where: Record<string, unknown> }) => Promise<number>>(),
      findMany: vi.fn<(args: { where: Record<string, unknown> }) => Promise<unknown[]>>(async () => []),
    },
    alumniProfile: { count: vi.fn<(args: { where: Record<string, unknown> }) => Promise<number>>() },
    duesPayment: { findMany: vi.fn(async () => []) },
    teamMember: { findMany: vi.fn(async () => []) },
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/services/paystack-client", () => ({
  isPaystackConfigured: () => false,
  initializeTransaction: vi.fn(),
  verifyTransaction: vi.fn(),
}));
vi.mock("@/lib/services/account-notification-service", () => ({
  notifyCashDuesPaymentRemoved: vi.fn(),
  notifyDuesPaymentReceived: vi.fn(),
}));

import { ENROLLED_STUDENT, ON_THE_ROLL } from "@/lib/services/membership-roll";
import { getMembershipOverview } from "@/lib/services/patron-insights-service";
import { listMembers } from "@/lib/services/membership-service";
import { listMemberDuesStatus } from "@/lib/services/dues-service";

const { db } = mocks;

beforeEach(() => {
  vi.clearAllMocks();
  db.member.findMany.mockResolvedValue([]);
  db.duesPayment.findMany.mockResolvedValue([]);
});

describe("the membership roll", () => {
  it("is everyone who hasn't graduated, whatever their alumni link", () => {
    expect(ON_THE_ROLL).toEqual({ graduatedAt: null });
    expect(ENROLLED_STUDENT).toEqual({ graduatedAt: null, status: "ACTIVE" });
  });

  it("is what the admin Members list asks for", async () => {
    await listMembers();
    const where = db.member.findMany.mock.calls[0][0].where as { AND?: unknown[] };
    expect(where.AND).toContainEqual({ graduatedAt: null });
    // The old rule dropped an alumnus who is studying again.
    expect(JSON.stringify(where)).not.toContain("alumniProfile");
  });

  it("is what the dues register asks for, so a returning alumnus still owes dues", async () => {
    await listMemberDuesStatus("2026/2027");
    expect(db.member.findMany.mock.calls[0][0].where).toEqual({ status: "ACTIVE", graduatedAt: null });
  });
});

describe("the figures patrons see", () => {
  it("counts students the same way, and counts a dual-status person once", async () => {
    db.member.count.mockImplementation(async ({ where }: Query) => (where.status === "ACTIVE" ? 92 : 94));
    db.alumniProfile.count.mockImplementation(async ({ where }: Query) => {
      if (where.sourceMember) return 1; // also enrolled again
      if (where.willingToMentor) return 3;
      return 22;
    });

    const overview = await getMembershipOverview();
    expect(overview).toEqual({
      students: 94,
      activeStudents: 92,
      alumni: 22,
      dualMembers: 1,
      mentors: 3,
      // 94 + 22 − the one person who is both.
      totalMembers: 115,
    });
    expect(db.member.count).toHaveBeenCalledWith({ where: { graduatedAt: null } });
    expect(db.alumniProfile.count).toHaveBeenCalledWith({
      where: { status: "ACTIVE", sourceMember: { graduatedAt: null } },
    });
  });
});
