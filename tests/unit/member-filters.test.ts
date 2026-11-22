import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  categoryOptions,
  describeMemberFilter,
  levelOptions,
  memberFilterFrom,
  memberFilterQuery,
} from "@/lib/member-filters";

/**
 * The members list's filters: special needs category (one or several),
 * track and level, and every combination of them with the rest.
 */

describe("reading the filters from the address bar", () => {
  it("takes several categories, from a repeated key", () => {
    const sp = new URLSearchParams("category=Visual+Impairment&category=Deafblindness&track=UNDERGRADUATE&level=Level+200");
    const filter = memberFilterFrom(sp);
    expect(filter.categories).toEqual(["Visual Impairment", "Deafblindness"]);
    expect(filter.applicationTrack).toBe("UNDERGRADUATE");
    expect(filter.level).toBe("Level 200");
  });

  it("reads Next's searchParams object the same way, arrays and all", () => {
    const filter = memberFilterFrom({ category: ["Deaf", "Deaf", " "], q: "  ama ", sort: "name" });
    expect(filter.categories).toEqual(["Deaf"]);
    expect(filter.search).toBe("ama");
    expect(filter.sort).toBe("name");
  });

  it("ignores a sort it doesn't know, and an empty category", () => {
    const filter = memberFilterFrom({ sort: "salary", category: "" });
    expect(filter.sort).toBe("newest");
    expect(filter.categories).toBeUndefined();
  });

  it("keeps every category in the export address, so the PDF is the list on screen", () => {
    const query = memberFilterQuery({ category: ["Deaf", "Autism Spectrum Disorder"], track: "POSTGRADUATE" });
    expect(new URLSearchParams(query).getAll("category")).toEqual(["Deaf", "Autism Spectrum Disorder"]);
  });
});

describe("saying what the list is a list of", () => {
  it("names categories with 'or', and the year group plainly", () => {
    const parts = describeMemberFilter(
      memberFilterFrom({ category: ["Deaf", "Deafblindness"], track: "UNDERGRADUATE", level: "Level 200" }),
    );
    expect(parts).toEqual(["Special needs: Deaf or Deafblindness", "Undergraduate", "Level 200"]);
  });

  it("says nothing when nothing is filtered", () => {
    expect(describeMemberFilter(memberFilterFrom({}))).toEqual([]);
  });
});

describe("what the filters offer", () => {
  it("offers the standard levels first, then any others members actually have", () => {
    // A record entered before the forms had a fixed list is still a member,
    // and has to be selectable.
    expect(levelOptions(["Level 100", "Level 200"], ["Level 200", "300", " ", "Level 100"])).toEqual([
      "Level 100",
      "Level 200",
      "300",
    ]);
  });

  it("never puts a postgraduate year among undergraduate levels — each track is given its own", () => {
    expect(levelOptions(["Year 1", "Year 2"], ["Year 2"])).toEqual(["Year 1", "Year 2"]);
  });

  it("offers the managed categories in order, then retired ones members still have", () => {
    expect(categoryOptions(["Visual Impairment", "Deaf"], ["Deaf", "Low Vision"])).toEqual([
      "Visual Impairment",
      "Deaf",
      "Low Vision",
    ]);
  });
});

// --- Against a real database: the combination actually narrows correctly. ---

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const suite = HAS_DB ? describe : describe.skip;

suite("filtering real members by category and level together", async () => {
  const { db } = await import("@/lib/db");
  const { listMembers } = await import("@/lib/services/membership-service");
  const stamp = randomUUID().slice(0, 8);
  const made: string[] = [];

  const people = [
    { name: "VisL2", department: `Vision-${stamp}`, track: "UNDERGRADUATE" as const, level: "Level 200" },
    { name: "VisL3", department: `Vision-${stamp}`, track: "UNDERGRADUATE" as const, level: "Level 300" },
    { name: "DeafL2", department: `Hearing-${stamp}`, track: "UNDERGRADUATE" as const, level: "Level 200" },
    { name: "VisPG", department: `Vision-${stamp}`, track: "POSTGRADUATE" as const, level: "Year 2" },
    { name: "Other", department: `Mobility-${stamp}`, track: "UNDERGRADUATE" as const, level: "Level 200" },
  ];

  beforeAll(async () => {
    for (const [i, p] of people.entries()) {
      const row = await db.member.create({
        data: {
          firstName: p.name,
          lastName: stamp,
          email: `test-filter-${stamp}-${i}@example.com`,
          phone: "0240000000",
          indexNumber: `TF${stamp.toUpperCase()}${i}`,
          programme: "B.Ed. Special Education",
          department: p.department,
          level: p.level,
          campus: "Winneba Main Campus",
          yearOfAdmission: 2024,
          gender: "FEMALE",
          status: "ACTIVE",
          applicationTrack: p.track,
          passwordHash: "not-used-in-this-test",
        },
      });
      made.push(row.id);
    }
  });

  afterAll(async () => {
    await db.member.deleteMany({ where: { id: { in: made } } });
  });

  const names = (rows: { firstName: string }[]) => rows.map((r) => r.firstName).sort();
  const ours = (rows: { lastName: string; firstName: string }[]) => rows.filter((r) => r.lastName === stamp);

  it("one category", async () => {
    const rows = ours(await listMembers({ categories: [`Vision-${stamp}`] }));
    expect(names(rows)).toEqual(["VisL2", "VisL3", "VisPG"]);
  });

  it("several categories — a member in any of them", async () => {
    const rows = ours(await listMembers({ categories: [`Vision-${stamp}`, `Hearing-${stamp}`] }));
    expect(names(rows)).toEqual(["DeafL2", "VisL2", "VisL3", "VisPG"]);
  });

  it("a category and an undergraduate level together", async () => {
    const rows = ours(
      await listMembers({ categories: [`Vision-${stamp}`], applicationTrack: "UNDERGRADUATE", level: "Level 200" }),
    );
    expect(names(rows)).toEqual(["VisL2"]);
  });

  it("every postgraduate in a category, whatever their year", async () => {
    const rows = ours(await listMembers({ categories: [`Vision-${stamp}`], applicationTrack: "POSTGRADUATE" }));
    expect(names(rows)).toEqual(["VisPG"]);
  });

  it("everybody at Level 200, whatever their category", async () => {
    const rows = ours(await listMembers({ applicationTrack: "UNDERGRADUATE", level: "Level 200" }));
    expect(names(rows)).toEqual(["DeafL2", "Other", "VisL2"]);
  });
});
