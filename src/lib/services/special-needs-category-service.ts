import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { DISABILITY_CATEGORIES } from "@/lib/validations/membership";
import {
  MAX_ACADEMIC_OPTION_LENGTH,
  isSameOptionLabel,
  tidyOptionLabel,
} from "@/lib/services/academic-options-service";

/**
 * The categories of special needs applicants can choose from, as
 * administrators have edited them. One list, shared by the undergraduate and
 * postgraduate registration forms, the alumni further-studies form, and the
 * admin editing screens.
 *
 * Stored in site_settings like the departments and programmes (see
 * academic-options-service.ts), and for the same reasons. Until an
 * administrator first edits it, the built-in DISABILITY_CATEGORIES apply.
 *
 * Removing a category only stops it being offered. Members and applications
 * store the text of what they chose, so nobody's existing record changes.
 */

const SETTINGS_KEY = "special-needs-categories";

/** The catch-all choice. New categories go above it so it stays last. */
const CATCH_ALL = "Other";

function normalize(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DISABILITY_CATEGORIES];
  const list = raw.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  // An empty list can't be saved (see removeSpecialNeedsCategory), so an
  // empty one here means something malformed — offer the defaults.
  return list.length > 0 ? list : [...DISABILITY_CATEGORIES];
}

/**
 * Read on every registration page view, so a failure falls back to the
 * built-in list instead of taking the form down.
 */
export const getSpecialNeedsCategories = cache(async (): Promise<string[]> => {
  try {
    const record = await db.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
    return normalize(record?.value);
  } catch (err) {
    console.error("[special-needs-categories] failed to load — falling back to the built-in list:", err);
    return normalize(null);
  }
});

export type SpecialNeedsCategoryChange = { ok: true } | { ok: false; error: string };

async function save(tx: Prisma.TransactionClient, categories: string[]) {
  await tx.siteSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: categories },
    create: { key: SETTINGS_KEY, value: categories },
  });
}

export async function addSpecialNeedsCategory(params: { label: string; adminId: string }): Promise<SpecialNeedsCategoryChange> {
  const label = tidyOptionLabel(params.label);
  if (!label) return { ok: false, error: "Enter the name of the category." };
  if (label.length > MAX_ACADEMIC_OPTION_LENGTH) {
    return { ok: false, error: `Keep the name under ${MAX_ACADEMIC_OPTION_LENGTH} characters.` };
  }

  // Read and write in one transaction, so two admins adding at the same
  // moment can't each save a list missing the other's addition.
  return db.$transaction(async (tx) => {
    const record = await tx.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
    const categories = normalize(record?.value);

    const existing = categories.find((item) => isSameOptionLabel(item, label));
    if (existing) return { ok: false, error: `"${existing}" is already in this list.` } as const;

    // The list keeps the order it has; a new category joins the end, above
    // "Other" so the catch-all is still the last thing anyone reads.
    const catchAll = categories.findIndex((item) => isSameOptionLabel(item, CATCH_ALL));
    if (catchAll === -1) categories.push(label);
    else categories.splice(catchAll, 0, label);

    await save(tx, categories);
    await tx.auditLog.create({
      data: {
        adminId: params.adminId,
        action: "ADD_SPECIAL_NEEDS_CATEGORY",
        entityType: "SpecialNeedsCategories",
        newValue: { label },
      },
    });
    return { ok: true } as const;
  });
}

export async function removeSpecialNeedsCategory(params: {
  label: string;
  adminId: string;
}): Promise<SpecialNeedsCategoryChange> {
  const { label, adminId } = params;

  return db.$transaction(async (tx) => {
    const record = await tx.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
    const categories = normalize(record?.value);

    const index = categories.indexOf(label);
    if (index === -1) return { ok: false, error: `"${label}" isn't in this list any more — refresh the page.` } as const;
    if (categories.length === 1) {
      return {
        ok: false,
        error: "Keep at least one category — applicants have to be able to choose something. Add the replacement first.",
      } as const;
    }

    categories.splice(index, 1);
    await save(tx, categories);
    await tx.auditLog.create({
      data: {
        adminId,
        action: "REMOVE_SPECIAL_NEEDS_CATEGORY",
        entityType: "SpecialNeedsCategories",
        previousValue: { label },
      },
    });
    return { ok: true } as const;
  });
}
