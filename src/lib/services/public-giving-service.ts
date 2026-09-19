import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { DonationFund } from "@/generated/prisma/client";
import { initializeTransaction, isPaystackConfigured } from "@/lib/services/paystack-client";
import { ONLINE_DONATION_PREFIX } from "@/lib/services/patron-finance-service";

/**
 * Giving from the public pages — Allies & Champions and Assistive Software —
 * by anyone, with no account. The same Donation rows, funds and Paystack
 * path as patrons' and alumni's gifts, with neither patronId nor alumniId
 * set. The receipt goes to the email address they gave.
 */

/**
 * The public pages a donor can be sent back to after checkout. A fixed list,
 * so the callback can never be turned into an open redirect.
 */
export const PUBLIC_GIVING_RETURN_PATHS = {
  allies: "/allies",
  "assistive-technology": "/assistive-technology",
  donate: "/donate",
} as const;

export type PublicGivingReturn = keyof typeof PUBLIC_GIVING_RETURN_PATHS;

export function isPublicGivingReturn(value: string | null | undefined): value is PublicGivingReturn {
  return Boolean(value && Object.prototype.hasOwnProperty.call(PUBLIC_GIVING_RETURN_PATHS, value));
}

export type InitiatePublicGivingResult = { ok: true; authorizationUrl: string } | { ok: false; error: string };

export async function initiatePublicDonation(params: {
  donorName: string;
  donorEmail: string;
  amountPesewas: number;
  fund: DonationFund;
  callbackUrl: string;
  /** Recorded on the gift so the finance team can see where it came from. */
  sourcePage: string;
}): Promise<InitiatePublicGivingResult> {
  const { donorName, donorEmail, amountPesewas, fund, callbackUrl, sourcePage } = params;

  if (!isPaystackConfigured()) {
    return {
      ok: false,
      error:
        "Online giving isn't switched on yet. The bank and Mobile Money details are on the Donate page — thank you for your patience.",
    };
  }

  const reference = `${ONLINE_DONATION_PREFIX}${randomUUID()}`;
  const donation = await db.donation.create({
    data: {
      donorName,
      donorEmail,
      fund,
      amountPesewas,
      anonymous: false,
      source: "ONLINE",
      status: "PENDING",
      reference,
      note: `Given from the ${sourcePage} page`,
    },
  });

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: donorEmail,
      amountPesewas,
      reference,
      callbackUrl,
      metadata: { donationId: donation.id, fund, kind: "donation", source: sourcePage },
    });
    return { ok: true, authorizationUrl };
  } catch (err) {
    console.error("[public-giving] failed to start Paystack transaction", err);
    return { ok: false, error: "We couldn't start the payment. Please try again in a moment." };
  }
}
