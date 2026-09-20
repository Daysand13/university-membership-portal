"use client";

import { useTransition, useState } from "react";
import { Loader2 } from "lucide-react";
import { showToast } from "@/components/ui/Toast";

export function ConfirmButton({
  action,
  confirmMessage,
  children,
  className,
}: {
  /** Anything it returns is shown as a confirmation — what was done, and who was emailed about it. */
  action: () => Promise<void | string>;
  confirmMessage: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        className={className}
        onClick={() => {
          if (!window.confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            try {
              const outcome = await action();
              if (typeof outcome === "string" && outcome) showToast({ text: outcome });
            } catch (err) {
              // Next.js's redirect() throws internally as part of how it
              // works — that's a signal to navigate, not a real failure,
              // so it must be allowed to propagate rather than be treated
              // as an error here.
              if (err && typeof err === "object" && "digest" in err && String(err.digest).startsWith("NEXT_REDIRECT")) {
                throw err;
              }
              const message = err instanceof Error && err.message ? err.message : "That didn't work — please try again.";
              setError(message);
              showToast({ text: message, variant: "error" });
            }
          });
        }}
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : children}
      </button>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
