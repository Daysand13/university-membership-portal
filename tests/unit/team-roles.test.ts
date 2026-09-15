import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { teamMember: { findMany: mocks.findMany } } }));

import { getTeamRoleBadges } from "@/lib/services/team-role-service";

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.findMany.mockResolvedValue([{ type: "LEADERSHIP", position: "President" }]);
});

describe("getTeamRoleBadges", () => {
  it("matches published listings through the member record and the person's account", async () => {
    expect(await getTeamRoleBadges({ memberIds: ["member-1"], userId: "user-1" })).toEqual([
      { type: "LEADERSHIP", position: "President" },
    ]);

    const { where } = mocks.findMany.mock.calls[0][0];
    expect(where.isActive).toBe(true);
    expect(where.OR).toEqual([{ memberId: { in: ["member-1"] } }, { member: { userId: "user-1" } }]);
  });

  it("finds a graduate's role through the member record they held as a student", async () => {
    await getTeamRoleBadges({ memberIds: [null, "old-member"], userId: null });
    expect(mocks.findMany.mock.calls[0][0].where.OR).toEqual([{ memberId: { in: ["old-member"] } }]);
  });

  it("returns no badges, without querying, when there's nothing to match on", async () => {
    expect(await getTeamRoleBadges({ memberIds: [null, undefined], userId: null })).toEqual([]);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("returns no badges rather than failing the dashboard when the lookup fails", async () => {
    mocks.findMany.mockRejectedValue(new Error("database down"));
    expect(await getTeamRoleBadges({ memberIds: ["member-1"], userId: null })).toEqual([]);
  });
});
