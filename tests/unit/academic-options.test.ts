import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the site_settings row and audit log, so these
// run without any database.
const store = vi.hoisted(() => ({ value: undefined as unknown, audit: [] as { data: Record<string, unknown> }[] }));

vi.mock("@/lib/db", () => {
  const tx = {
    siteSetting: {
      findUnique: async () => (store.value === undefined ? null : { key: "academic-options", value: store.value }),
      upsert: async ({ update }: { update: { value: unknown } }) => {
        store.value = JSON.parse(JSON.stringify(update.value));
        return {};
      },
    },
    auditLog: {
      create: async (args: { data: Record<string, unknown> }) => {
        store.audit.push(args);
        return {};
      },
    },
  };
  return { db: { ...tx, $transaction: async <T,>(fn: (t: typeof tx) => Promise<T>) => fn(tx) } };
});

import { addAcademicOption, removeAcademicOption } from "@/lib/services/academic-options-service";
import { academicChoiceErrors, DEFAULT_ACADEMIC_OPTIONS, type AcademicOptions } from "@/lib/validations/membership";

const saved = () => store.value as AcademicOptions;

beforeEach(() => {
  store.value = undefined;
  store.audit = [];
});

describe("addAcademicOption", () => {
  it("starts from the built-in lists and inserts alphabetically without reordering them", async () => {
    const result = await addAcademicOption({
      track: "UNDERGRADUATE",
      kind: "departments",
      label: "Adult Education",
      adminId: "admin1",
    });
    expect(result).toEqual({ ok: true });

    const list = saved().UNDERGRADUATE.departments;
    const defaults = DEFAULT_ACADEMIC_OPTIONS.UNDERGRADUATE.departments;
    expect(list).toHaveLength(defaults.length + 1);
    expect(list.indexOf("Adult Education")).toBe(list.indexOf("African and Liberal Studies") - 1);
    expect(list.filter((d) => d !== "Adult Education")).toEqual(defaults);
  });

  it("leaves every other list untouched", async () => {
    await addAcademicOption({ track: "POSTGRADUATE", kind: "programmes", label: "MPhil Inclusive Education", adminId: "a" });
    expect(saved().UNDERGRADUATE).toEqual(DEFAULT_ACADEMIC_OPTIONS.UNDERGRADUATE);
    expect(saved().POSTGRADUATE.departments).toEqual(DEFAULT_ACADEMIC_OPTIONS.POSTGRADUATE.departments);
    expect(saved().POSTGRADUATE.programmes).toContain("MPhil Inclusive Education");
  });

  it("tidies spacing before saving", async () => {
    await addAcademicOption({ track: "UNDERGRADUATE", kind: "programmes", label: "   BEd   Deaf  Studies  ", adminId: "a" });
    expect(saved().UNDERGRADUATE.programmes).toContain("BEd Deaf Studies");
  });

  it("refuses a duplicate regardless of capitalisation, naming the existing entry", async () => {
    const result = await addAcademicOption({ track: "UNDERGRADUATE", kind: "departments", label: "special education", adminId: "a" });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain('"Special Education"');
    expect(store.audit).toHaveLength(0);
  });

  it("refuses an empty name", async () => {
    const result = await addAcademicOption({ track: "UNDERGRADUATE", kind: "departments", label: "   ", adminId: "a" });
    expect(result.ok).toBe(false);
  });

  it("records who added what", async () => {
    await addAcademicOption({ track: "UNDERGRADUATE", kind: "departments", label: "Adult Education", adminId: "admin7" });
    expect(store.audit[0].data).toMatchObject({
      adminId: "admin7",
      action: "ADD_ACADEMIC_OPTION",
      entityId: "UNDERGRADUATE:departments",
      newValue: { label: "Adult Education" },
    });
  });
});

describe("removeAcademicOption", () => {
  it("removes the option and records it", async () => {
    const result = await removeAcademicOption({ track: "UNDERGRADUATE", kind: "departments", label: "Special Education", adminId: "a" });
    expect(result).toEqual({ ok: true });
    expect(saved().UNDERGRADUATE.departments).not.toContain("Special Education");
    expect(store.audit[0].data).toMatchObject({ action: "REMOVE_ACADEMIC_OPTION", previousValue: { label: "Special Education" } });
  });

  it("says so when the option is already gone", async () => {
    const result = await removeAcademicOption({ track: "UNDERGRADUATE", kind: "departments", label: "Not A Department", adminId: "a" });
    expect(result.ok).toBe(false);
  });

  it("won't remove the last option, so the form always has something to offer", async () => {
    store.value = {
      UNDERGRADUATE: { departments: ["Only One"], programmes: ["P"] },
      POSTGRADUATE: DEFAULT_ACADEMIC_OPTIONS.POSTGRADUATE,
    };
    const result = await removeAcademicOption({ track: "UNDERGRADUATE", kind: "departments", label: "Only One", adminId: "a" });
    expect(result.ok).toBe(false);
    expect(saved().UNDERGRADUATE.departments).toEqual(["Only One"]);
  });
});

describe("academicChoiceErrors", () => {
  const options: AcademicOptions = {
    UNDERGRADUATE: { departments: ["Special Education"], programmes: ["BEd Special Education"] },
    POSTGRADUATE: { departments: ["Special Education"], programmes: ["MPhil Special Education"] },
  };

  it("accepts choices that are offered for the track", () => {
    expect(
      academicChoiceErrors(options, "UNDERGRADUATE", { academicDepartment: "Special Education", programme: "BEd Special Education" }),
    ).toBeNull();
  });

  it("rejects a programme offered only on the other track, or no longer offered", () => {
    expect(
      academicChoiceErrors(options, "UNDERGRADUATE", { academicDepartment: "Special Education", programme: "MPhil Special Education" }),
    ).toEqual({ programme: ["Select a valid program of study"] });
    expect(
      academicChoiceErrors(options, "POSTGRADUATE", { academicDepartment: "History Education", programme: "MPhil Special Education" }),
    ).toEqual({ academicDepartment: ["Select a valid academic department"] });
  });
});
