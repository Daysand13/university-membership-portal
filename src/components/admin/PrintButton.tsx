"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print or Save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-md bg-primary-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-900"
    >
      <Printer size={16} aria-hidden="true" /> {label}
    </button>
  );
}
