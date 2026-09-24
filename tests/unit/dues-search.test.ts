import { describe, expect, it } from "vitest";
import { describeDuesFilter, filterDuesRows } from "@/lib/services/dues-service";
import type { MemberDuesRow } from "@/lib/services/dues-service";

function row(overrides: Partial<MemberDuesRow>): MemberDuesRow {
  return {
    memberId: "m1",
    fullName: "Ama Serwaa Mensah",
    indexNumber: "2300123",
    level: "300",
    applicationTrack: "UNDERGRADUATE",
    fee: { amountPesewas: 5000, tierLabel: "Continuing" },
    paid: false,
    paidAt: null,
    payment: null,
    ...overrides,
  } as MemberDuesRow;
}

const register = [
  row({ memberId: "m1", fullName: "Ama Serwaa Mensah", indexNumber: "2300123", paid: true }),
  row({ memberId: "m2", fullName: "Kojo Addo", indexNumber: "2300124" }),
  row({ memberId: "m3", fullName: "Elizabeth Adutwumwaa", indexNumber: "2400987", paid: true }),
];

describe("finding somebody in the dues register", () => {
  it("returns everybody when nothing is asked for", () => {
    expect(filterDuesRows(register, {})).toHaveLength(3);
  });

  it("finds a member by part of their name, whatever the case", () => {
    expect(filterDuesRows(register, { search: "kojo" }).map((r) => r.memberId)).toEqual(["m2"]);
    expect(filterDuesRows(register, { search: "MENSAH" }).map((r) => r.memberId)).toEqual(["m1"]);
    // A middle name is how half the register is searched for.
    expect(filterDuesRows(register, { search: "Serwaa" }).map((r) => r.memberId)).toEqual(["m1"]);
  });

  it("finds a member by index number, whole or part", () => {
    expect(filterDuesRows(register, { search: "2400987" }).map((r) => r.memberId)).toEqual(["m3"]);
    expect(filterDuesRows(register, { search: "23001" }).map((r) => r.memberId)).toEqual(["m1", "m2"]);
  });

  it("ignores the spaces around what was typed", () => {
    expect(filterDuesRows(register, { search: "  kojo  " }).map((r) => r.memberId)).toEqual(["m2"]);
  });

  it("combines a search with the paid filter", () => {
    expect(filterDuesRows(register, { status: "paid" }).map((r) => r.memberId)).toEqual(["m1", "m3"]);
    expect(filterDuesRows(register, { status: "unpaid" }).map((r) => r.memberId)).toEqual(["m2"]);
    expect(filterDuesRows(register, { status: "unpaid", search: "2300" }).map((r) => r.memberId)).toEqual(["m2"]);
  });

  it("says what it narrowed to, for the top of the printed ledger", () => {
    expect(describeDuesFilter({})).toBe("");
    expect(describeDuesFilter({ status: "unpaid" })).toContain("Unpaid only");
    expect(describeDuesFilter({ status: "paid", search: "Kojo" })).toBe('Filters applied — Paid only · Matching "Kojo"');
  });
});
