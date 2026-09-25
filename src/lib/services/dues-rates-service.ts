import "server-only";
import { db } from "@/lib/db";
import type { AdminUser } from "@/generated/prisma/client";

/**
 * What dues cost, as the executive last decided.
 *
 * These used to be three numbers in the source, which meant a change of
 * fee needed a developer and a deployment — for a decision the executive
 * takes at a meeting. They live in Site Settings now, with the figures
 * that were in the code as the fallback, so nothing moves until somebody
 * deliberately moves it.
 *
 * Changing a rate never rewrites history: every payment stores the amount
 * and the tier label it was charged at.
 */

const RATES_KEY = "dues-rates";
const PESEWAS_PER_CEDI = 100;

export interface DuesRates {
  /** Level 100, and postgraduates in their first year. */
  fresherOrPgFirstYear: number;
  continuing: number;
  /** Anyone linked to an active Leadership listing. */
  executive: number;
}

/** The schedule as agreed before any of this was editable. */
export const DEFAULT_DUES_RATES: DuesRates = {
  fresherOrPgFirstYear: 60 * PESEWAS_PER_CEDI,
  continuing: 50 * PESEWAS_PER_CEDI,
  executive: 70 * PESEWAS_PER_CEDI,
};

function readRates(value: unknown): DuesRates {
  if (!value || typeof value !== "object") return DEFAULT_DUES_RATES;
  const source = value as Record<string, unknown>;
  const amount = (key: keyof DuesRates) => {
    const raw = source[key];
    // A rate that isn't a sensible number falls back rather than charging
    // somebody nothing, or something absurd.
    return typeof raw === "number" && Number.isInteger(raw) && raw > 0 && raw <= 100_000
      ? raw
      : DEFAULT_DUES_RATES[key];
  };
  return {
    fresherOrPgFirstYear: amount("fresherOrPgFirstYear"),
    continuing: amount("continuing"),
    executive: amount("executive"),
  };
}

export async function getDuesRates(): Promise<DuesRates> {
  const row = await db.siteSetting.findUnique({ where: { key: RATES_KEY } });
  return readRates(row?.value);
}

export async function setDuesRates(params: { rates: DuesRates; actor: Pick<AdminUser, "id"> }): Promise<DuesRates> {
  const previous = await getDuesRates();
  const rates = readRates(params.rates);

  await db.siteSetting.upsert({
    where: { key: RATES_KEY },
    update: { value: { ...rates } },
    create: { key: RATES_KEY, value: { ...rates } },
  });

  await db.auditLog.create({
    data: {
      adminId: params.actor.id,
      action: "SET_DUES_RATES",
      entityType: "SiteSetting",
      entityId: RATES_KEY,
      previousValue: { ...previous },
      newValue: { ...rates },
    },
  });

  return rates;
}
