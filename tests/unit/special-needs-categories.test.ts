import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the site_settings row and audit log, so these
// run without any database.
const store = vi.hoisted(() => ({ value: undefined as unknown, audit: [] as { data: Record<string, unknown> }[] }));

vi.mock("@/lib/db", () => {
  const tx = {
    siteSetting: {
      findUnique: async () => (store.value === undefined ? null : { key: "special-needs-categories", value: store.value }),
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

import {
  addSpecialNeedsCategory,
  getSpecialNeedsCategories,
  removeSpecialNeedsCategory,
} from "@/lib/services/special-needs-category-service";
import { DISABILITY_CATEGORIES, specialNeedsCategoryErrors } from "@/lib/validations/membership";

const saved = () => store.value as string[];

beforeEach(() => {
  store.value = undefined;
  store.audit = [];
});

describe("getSpecialNeedsCategories", () => {
  it("offers the built-in categories until an administrator edits the list", async () => {
    expect(await getSpecialNeedsCategories()).toEqual([...DISABILITY_CATEGORIES]);
  });
});

describe("addSpecialNeedsCategory", () => {
  it("adds a category above Other, leaving the rest of the order alone", async () => {
    expect(await addSpecialNeedsCategory({ label: "Albinism", adminId: "a" })).toEqual({ ok: true });

    const list = saved();
    expect(list).toHaveLength(DISABILITY_CATEGORIES.length + 1);
    expect(list.at(-1)).toBe("Other");
    expect(list.at(-2)).toBe("Albinism");
    expect(list.filter((c) => c !== "Albinism")).toEqual([...DISABILITY_CATEGORIES]);
  });

  it("appends when there's no Other in the list", async () => {
    store.value = ["Deaf", "Visual Impairment"];
    await addSpecialNeedsCategory({ label: "Albinism", adminId: "a" });
    expect(saved()).toEqual(["Deaf", "Visual Impairment", "Albinism"]);
  });

  it("tidies spacing, and refuses a duplicate regardless of capitalisation", async () => {
    await addSpecialNeedsCategory({ label: "  Sickle   Cell  Disease ", adminId: "a" });
    expect(saved()).toContain("Sickle Cell Disease");

    const duplicate = await addSpecialNeedsCategory({ label: "visual impairment", adminId: "a" });
    expect(duplicate.ok).toBe(false);
    expect(!duplicate.ok && duplicate.error).toContain('"Visual Impairment"');
  });

  it("refuses an empty name and records who added what", async () => {
    expect((await addSpecialNeedsCategory({ label: "   ", adminId: "a" })).ok).toBe(false);

    await addSpecialNeedsCategory({ label: "Albinism", adminId: "admin7" });
    expect(store.audit[0].data).toMatchObject({
      adminId: "admin7",
      action: "ADD_SPECIAL_NEEDS_CATEGORY",
      newValue: { label: "Albinism" },
    });
  });
});

describe("removeSpecialNeedsCategory", () => {
  it("removes the category and records it", async () => {
    expect(await removeSpecialNeedsCategory({ label: "Epilepsy", adminId: "a" })).toEqual({ ok: true });
    expect(saved()).not.toContain("Epilepsy");
    expect(store.audit[0].data).toMatchObject({ action: "REMOVE_SPECIAL_NEEDS_CATEGORY", previousValue: { label: "Epilepsy" } });
  });

  it("won't remove the last category, so the form always has something to offer", async () => {
    store.value = ["Other"];
    expect((await removeSpecialNeedsCategory({ label: "Other", adminId: "a" })).ok).toBe(false);
    expect(saved()).toEqual(["Other"]);
  });

  it("says so when the category is already gone", async () => {
    expect((await removeSpecialNeedsCategory({ label: "Not A Category", adminId: "a" })).ok).toBe(false);
  });
});

describe("specialNeedsCategoryErrors", () => {
  it("accepts an offered category and rejects one that isn't offered", () => {
    expect(specialNeedsCategoryErrors(["Deaf", "Albinism"], "Albinism")).toBeNull();
    expect(specialNeedsCategoryErrors(["Deaf"], "Epilepsy")).toEqual({
      department: ["Select a valid category of special needs"],
    });
  });
});
