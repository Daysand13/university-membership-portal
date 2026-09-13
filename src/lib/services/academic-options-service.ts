import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  APPLICATION_TRACKS,
  DEFAULT_ACADEMIC_OPTIONS,
  type AcademicOptions,
  type ApplicationTrack,
} from "@/lib/validations/membership";

/**
 * The academic departments and programmes of study offered on the
 * undergraduate and postgraduate registration forms, as administrators have
 * edited them.
 *
 * Stored as one JSON value in site_settings rather than a table of its own:
 * it's a small, admin-edited list that's always read whole, which is exactly
 * what that table already holds for the rest of the site's settings.
 *
 * Removing an option only stops it being offered. Members and applications
 * store the text of what they chose, so nobody's existing record changes.
 */

const SETTINGS_KEY = "academic-options";

export type AcademicOptionKind = "departments" | "programmes";

export const MAX_ACADEMIC_OPTION_LENGTH = 300;

const KIND_NOUN: Record<AcademicOptionKind, string> = {
  departments: "academic department",
  programmes: "programme of study",
};

function readList(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const list = value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  // An empty list can't be saved (see removeAcademicOption), so an empty one
  // here means something malformed — offer the defaults rather than nothing.
  return list.length > 0 ? list : [...fallback];
}

function normalize(raw: unknown): AcademicOptions {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result = {} as AcademicOptions;
  for (const track of APPLICATION_TRACKS) {
    const lists = source[track] && typeof source[track] === "object" ? (source[track] as Record<string, unknown>) : {};
    result[track] = {
      departments: readList(lists.departments, DEFAULT_ACADEMIC_OPTIONS[track].departments),
      programmes: readList(lists.programmes, DEFAULT_ACADEMIC_OPTIONS[track].programmes),
    };
  }
  return result;
}

/**
 * Read on every registration page view, so a failure falls back to the
 * built-in lists instead of taking the form down — a slightly out-of-date
 * list is far better than an applicant being unable to register.
 */
export const getAcademicOptions = cache(async (): Promise<AcademicOptions> => {
  try {
    const record = await db.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
    return normalize(record?.value);
  } catch (err) {
    console.error("[academic-options] failed to load — falling back to the built-in lists:", err);
    return normalize(null);
  }
});

function tidy(label: string): string {
  return label.replace(/\s+/g, " ").trim();
}

function sameOption(a: string, b: string): boolean {
  return a.localeCompare(b, "en", { sensitivity: "base" }) === 0;
}

export type AcademicOptionChange = { ok: true } | { ok: false; error: string };

async function save(tx: Prisma.TransactionClient, options: AcademicOptions) {
  const value = options as unknown as Prisma.InputJsonValue;
  await tx.siteSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value },
    create: { key: SETTINGS_KEY, value },
  });
}

export async function addAcademicOption(params: {
  track: ApplicationTrack;
  kind: AcademicOptionKind;
  label: string;
  adminId: string;
}): Promise<AcademicOptionChange> {
  const { track, kind, adminId } = params;
  const label = tidy(params.label);
  const noun = KIND_NOUN[kind];

  if (!label) return { ok: false, error: `Enter the name of the ${noun}.` };
  if (label.length > MAX_ACADEMIC_OPTION_LENGTH) {
    return { ok: false, error: `Keep the name under ${MAX_ACADEMIC_OPTION_LENGTH} characters.` };
  }

  // Read and write in one transaction, so two admins adding at the same
  // moment can't each save a list missing the other's addition.
  return db.$transaction(async (tx) => {
    const record = await tx.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
    const options = normalize(record?.value);
    const list = options[track][kind];

    const existing = list.find((item) => sameOption(item, label));
    if (existing) return { ok: false, error: `"${existing}" is already in this list.` } as const;

    // Keeps the list alphabetical without reordering anything already there.
    const insertAt = list.findIndex((item) => item.localeCompare(label, "en", { sensitivity: "base" }) > 0);
    if (insertAt === -1) list.push(label);
    else list.splice(insertAt, 0, label);

    await save(tx, options);
    await tx.auditLog.create({
      data: {
        adminId,
        action: "ADD_ACADEMIC_OPTION",
        entityType: "AcademicOptions",
        entityId: `${track}:${kind}`,
        newValue: { label },
      },
    });
    return { ok: true } as const;
  });
}

export async function removeAcademicOption(params: {
  track: ApplicationTrack;
  kind: AcademicOptionKind;
  label: string;
  adminId: string;
}): Promise<AcademicOptionChange> {
  const { track, kind, label, adminId } = params;
  const noun = KIND_NOUN[kind];

  return db.$transaction(async (tx) => {
    const record = await tx.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
    const options = normalize(record?.value);
    const list = options[track][kind];

    const index = list.indexOf(label);
    if (index === -1) return { ok: false, error: `"${label}" isn't in this list any more — refresh the page.` } as const;
    if (list.length === 1) {
      return {
        ok: false,
        error: `Keep at least one ${noun} — applicants have to be able to choose something. Add the replacement first.`,
      } as const;
    }

    list.splice(index, 1);
    await save(tx, options);
    await tx.auditLog.create({
      data: {
        adminId,
        action: "REMOVE_ACADEMIC_OPTION",
        entityType: "AcademicOptions",
        entityId: `${track}:${kind}`,
        previousValue: { label },
      },
    });
    return { ok: true } as const;
  });
}
