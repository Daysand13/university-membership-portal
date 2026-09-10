import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/services/paystack-client";
import { verifyAndRecordDuesPayment } from "@/lib/services/dues-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The reliable half of confirming a payment — see the callback route for
 * why the browser redirect alone isn't enough (closed tabs, dropped
 * connections). Paystack retries this endpoint on failure, so returning a
 * non-2xx for anything recoverable is deliberate; returning 200 for a
 * signature failure or a malformed body is not — those will never become
 * valid on retry, and pretending otherwise would just hide the problem.
 *
 * The signature is checked against the RAW request body (before any JSON
 * parsing), because HMAC verification is over the exact bytes Paystack
 * sent — re-serializing a parsed object is not guaranteed to reproduce
 * them byte-for-byte.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[paystack-webhook] signature verification failed");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Only the event that means money actually moved triggers a lookup;
  // Paystack sends several other event types this integration doesn't act
  // on, and those are acknowledged without doing anything.
  if (event.event === "charge.success" && event.data?.reference) {
    const result = await verifyAndRecordDuesPayment(event.data.reference);
    if (!result.ok) {
      // Not the signature's fault — something failed asking Paystack to
      // re-confirm. Worth a retry, so this is the one case that returns
      // non-2xx despite a valid signature.
      console.error("[paystack-webhook] verification failed for", event.data.reference, result.error);
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
  }

  return NextResponse.json({ received: true });
}
