import { describe, expect, it } from "vitest";
import { build, describe as readBack, EMPTY_PARTS, partsFrom } from "@/lib/date-parts";

/**
 * Typed dates: the boxes a member fills in, turned into exactly the value
 * the browser's date picker used to send — so nothing on the server moved —
 * and every way they can fail to add up, said in words.
 */

const parts = (p: Partial<typeof EMPTY_PARTS>) => ({ ...EMPTY_PARTS, ...p });

describe("a date", () => {
  it("sends the value the old date picker sent", () => {
    expect(build(parts({ day: "27", month: "3", year: "2001" }), "date")).toEqual({
      value: "2001-03-27",
      empty: false,
      problem: null,
    });
  });

  it("sends nothing, and says nothing, when left empty", () => {
    expect(build(EMPTY_PARTS, "date")).toEqual({ value: "", empty: true, problem: null });
  });

  it("names what is missing rather than sending half a date", () => {
    expect(build(parts({ year: "2001" }), "date").problem).toBe("Enter the day and month.");
    expect(build(parts({ day: "4", year: "2001" }), "date").problem).toBe("Enter the month.");
  });

  it("knows February, and leap years", () => {
    expect(build(parts({ day: "29", month: "2", year: "2027" }), "date").problem).toMatch(/February 2027 has 28 days/);
    expect(build(parts({ day: "29", month: "2", year: "2028" }), "date").value).toBe("2028-02-29");
  });

  it("asks for a four-figure year", () => {
    expect(build(parts({ day: "1", month: "1", year: "01" }), "date").problem).toMatch(/four numbers/);
  });

  it("keeps to the earliest and latest allowed", () => {
    const tooLate = build(parts({ day: "2", month: "12", year: "2026" }), "date", { max: "2026-12-01" });
    expect(tooLate.problem).toBe("The date must be on or before 1 December 2026.");
    const tooEarly = build(parts({ day: "1", month: "1", year: "2020" }), "date", { min: "2024-05-01" });
    expect(tooEarly.problem).toBe("The date must be on or after 1 May 2024.");
  });

  it("reads back in words", () => {
    expect(readBack("2001-03-27", "date")).toBe("27 March 2001");
  });

  it("reads a stored value back into the boxes", () => {
    expect(partsFrom("2001-03-07", "date")).toMatchObject({ day: "7", month: "3", year: "2001" });
    // A full timestamp, as a Date's toISOString gives, still finds its date.
    expect(partsFrom("2001-03-07T00:00:00.000Z", "date")).toMatchObject({ day: "7", month: "3", year: "2001" });
  });
});

describe("a month — the CV's 'from' and 'to'", () => {
  it("sends year and month", () => {
    expect(build(parts({ month: "9", year: "2021" }), "month").value).toBe("2021-09");
    expect(partsFrom("2021-09", "month")).toMatchObject({ month: "9", year: "2021" });
  });
});

describe("a time, on the clock face people use", () => {
  it("turns 2:30 pm into 14:30, and midnight and noon the right way round", () => {
    expect(build(parts({ hour: "2", minute: "30", meridiem: "pm" }), "time").value).toBe("14:30");
    expect(build(parts({ hour: "12", minute: "00", meridiem: "am" }), "time").value).toBe("00:00");
    expect(build(parts({ hour: "12", minute: "15", meridiem: "pm" }), "time").value).toBe("12:15");
  });

  it("reads 24-hour values back to the clock face", () => {
    expect(partsFrom("00:05", "time")).toMatchObject({ hour: "12", minute: "05", meridiem: "am" });
    expect(partsFrom("13:40", "time")).toMatchObject({ hour: "1", minute: "40", meridiem: "pm" });
  });

  it("asks for am or pm rather than guessing", () => {
    expect(build(parts({ hour: "2", minute: "30" }), "time").problem).toBe("Enter the am or pm.");
  });
});

describe("a date and time — booking a mentorship session", () => {
  it("sends what datetime-local sent", () => {
    const built = build(parts({ day: "5", month: "11", year: "2026", hour: "9", minute: "00", meridiem: "am" }), "datetime");
    expect(built.value).toBe("2026-11-05T09:00");
    expect(readBack(built.value, "datetime")).toBe("5 November 2026 at 9:00 am");
  });

  it("round-trips a stored value", () => {
    const p = partsFrom("2026-11-05T18:45", "datetime");
    expect(build(p, "datetime").value).toBe("2026-11-05T18:45");
  });
});
