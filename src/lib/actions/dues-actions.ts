"use server";

import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/member";
import { initiateDuesPayment } from "@/lib/services/dues-service";
import { withActionErrorHandling } from "@/lib/actions/with-error-handling";
import type { ActionState } from "@/lib/actions/types";

/**
 * Starts a dues payment for the signed-in member and sends their browser to
 * Paystack. A rejection (already paid, Paystack unconfigured, the API call
 * itself failing) comes back as ActionState.error rather than throwing, so
 * the dashboard can show the actual reason instead of a generic failure —
 * "already paid" and "payments aren't set up yet" need different reactions
 * from the person reading them.
 */
async function initiateDuesPaymentActionImpl(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  // Neither argument is used — useActionState requires this exact shape,
  // but the form has no fields; everything needed comes from the session.
  void _prevState;
  void _formData;
  const member = await requireMember();

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/dues/callback`;
  const result = await initiateDuesPayment({ member, callbackUrl });

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(result.authorizationUrl);
}

export const initiateDuesPaymentAction = withActionErrorHandling(
  "initiateDuesPaymentAction",
  initiateDuesPaymentActionImpl,
);
