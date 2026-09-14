"use client";

import { useSyncExternalStore } from "react";
import { isAndroidDevice, medicalReportAccept } from "@/lib/client/file-accept";

const subscribeNever = () => () => {};

/**
 * The one file field for a medical report — a saved PDF or Word document, or
 * a photo of the paper copy — that opens a picker able to reach both on
 * every phone. Which `accept` list that takes depends on the platform; see
 * lib/client/file-accept.ts for why, with the Chrome source it follows.
 *
 * Until the page is interactive the Android list is used: it opens the file
 * browser everywhere, so a PDF is always reachable even before this knows
 * what device it's on.
 */
export function MedicalReportInput({
  id,
  inputRef,
  onFile,
  disabled,
  describedBy,
}: {
  id: string;
  inputRef?: React.Ref<HTMLInputElement>;
  /** The chosen file; undefined when the picker was cancelled. */
  onFile: (file: File | undefined) => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  const android = useSyncExternalStore(
    subscribeNever,
    () => isAndroidDevice(navigator),
    () => true,
  );

  return (
    <input
      ref={inputRef}
      id={id}
      type="file"
      // No `name`: the file goes straight to storage and only its signed
      // ticket is submitted. No `capture`: that would skip straight to the
      // camera and hide saved files.
      accept={medicalReportAccept(android)}
      disabled={disabled}
      aria-describedby={describedBy}
      onChange={(e) => {
        const file = e.target.files?.[0];
        // Cleared so choosing the same file again (after a failed upload)
        // still counts as a new choice. The form shows what's attached.
        e.target.value = "";
        onFile(file);
      }}
      className="block w-full text-sm text-slate file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-800 file:text-sm file:font-semibold hover:file:bg-primary-100 disabled:opacity-60"
    />
  );
}
