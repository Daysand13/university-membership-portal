"use client";

import { useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { payForCvAction } from "@/lib/actions/cv-actions";

/**
 * Off to Paystack's own checkout, the same way dues are paid. Nothing
 * about a card is ever typed into this site.
 */
export function PayForCvButton({ amount, portal }: { amount: string; portal: "member" | "alumni" }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button type="button" disabled={isPending} onClick={() => startTransition(() => payForCvAction(portal))}>
      {isPending ? (
        <Loader2 size={16} aria-hidden="true" className="animate-spin" />
      ) : (
        <CreditCard size={16} aria-hidden="true" />
      )}
      {isPending ? "Opening secure checkout…" : `Pay ${amount} and unlock it`}
    </Button>
  );
}
