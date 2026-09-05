"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server-side, this would already be in the platform's function logs —
    // logging it here too means it also shows up in the browser console,
    // which is the fastest way to see the real cause while testing.
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-surface-muted px-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-line p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-danger-light text-danger flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={26} />
        </div>
        <h1 className="font-display font-bold text-xl text-primary-950">Something went wrong</h1>
        <p className="text-sm text-slate mt-2 leading-relaxed">
          We hit an unexpected error loading this page. This has been logged — please try again, or head back to
          the homepage.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary-800 text-white font-semibold px-5 py-2.5 text-sm hover:bg-primary-900"
          >
            <RotateCw size={14} /> Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-line font-semibold px-5 py-2.5 text-sm text-slate hover:border-primary-600 hover:text-primary-800"
          >
            Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
