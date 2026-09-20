"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X, TriangleAlert } from "lucide-react";

/**
 * Short-lived confirmations — "Saved, and a receipt was emailed to …".
 *
 * Deliberately not a React context: toasts are raised from forms, buttons
 * and dialogs all over the app, and threading a provider through every one
 * of them would be a lot of plumbing for a message that lives for five
 * seconds. A window event reaches the host wherever it is, which also
 * means a form doesn't need to know whether a host exists at all.
 *
 * The host is a polite live region, so a screen reader hears the same
 * confirmation a sighted person sees — announced when it arrives, not
 * cutting off whatever is being read.
 */

export interface ToastMessage {
  text: string;
  variant?: "success" | "error";
}

const EVENT = "portal:toast";
const DISMISS_AFTER_MS = 6000;

export function showToast(toast: ToastMessage) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastMessage>(EVENT, { detail: toast }));
}

interface ShownToast extends ToastMessage {
  id: number;
}

export function Toaster() {
  const [toasts, setToasts] = useState<ShownToast[]>([]);

  useEffect(() => {
    let nextId = 0;
    function onToast(event: Event) {
      const detail = (event as CustomEvent<ToastMessage>).detail;
      if (!detail?.text) return;
      const id = nextId++;
      setToasts((current) => [...current.slice(-2), { ...detail, id }]);
      window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), DISMISS_AFTER_MS);
    }
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => {
        const isError = toast.variant === "error";
        const Icon = isError ? TriangleAlert : CheckCircle2;
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${
              isError ? "border-danger/30 bg-danger-light text-danger" : "border-success/30 bg-success-light text-success"
            }`}
          >
            <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            <p className="text-sm font-medium leading-snug flex-1">{toast.text}</p>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
              aria-label="Dismiss this message"
              className="shrink-0 rounded p-1 hover:bg-black/5"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
