"use client";

import { useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { payForLetterAction } from "@/lib/actions/letter-actions";

/** Off to Paystack's own checkout, the same way dues and a CV are paid. */
export function PayForLetterButton({ letterId, amount }: { letterId: string; amount: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button type="button" disabled={isPending} onClick={() => startTransition(() => payForLetterAction(letterId))}>
      {isPending ? (
        <Loader2 size={16} aria-hidden="true" className="animate-spin" />
      ) : (
        <CreditCard size={16} aria-hidden="true" />
      )}
      {isPending ? "Opening secure checkout…" : `Pay ${amount} for this letter`}
    </Button>
  );
}
