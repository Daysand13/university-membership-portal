import Link from "next/link";
import { AlertTriangle, Download, FileDown, IdCard } from "lucide-react";

export interface IdCardIssue {
  message: string;
  href?: string;
  linkLabel?: string;
}

/**
 * The association ID card on a member's admin page: a live preview of both
 * sides, the downloads, and a note of anything that will make the printed
 * card incomplete. Administrators only — members don't see ID cards yet.
 */
export function IdCardPanel({
  memberId,
  memberName,
  issues,
  version,
}: {
  memberId: string;
  memberName: string;
  issues: IdCardIssue[];
  /** Changes whenever the member record does, so the preview never shows a stale copy. */
  version: string;
}) {
  const base = `/api/admin/members/${memberId}/id-card`;
  const buttonClasses =
    "inline-flex items-center gap-1.5 rounded-md border border-primary-800 px-3 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-50";

  return (
    <section aria-labelledby="id-card-heading" className="bg-white rounded-lg border border-line p-6 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="max-w-xl">
          <h2 id="id-card-heading" className="font-display font-bold text-base text-primary-950 flex items-center gap-2">
            <IdCard size={18} aria-hidden="true" /> Association ID Card
          </h2>
          <p className="text-sm text-slate mt-1">
            Visible to administrators only. Sized for standard ID card stock (85.6 × 54 mm), at print resolution.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${base}?side=front&download=1`} className={buttonClasses}>
            <Download size={15} aria-hidden="true" /> Front (PNG)
          </a>
          <a href={`${base}?side=back&download=1`} className={buttonClasses}>
            <Download size={15} aria-hidden="true" /> Back (PNG)
          </a>
          <a
            href={`${base}?format=pdf`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-800 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-900"
          >
            <FileDown size={15} aria-hidden="true" /> Both sides (print-ready PDF)
          </a>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="mb-4 rounded-md border border-warning bg-warning-light px-4 py-3 text-sm text-warning">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={15} aria-hidden="true" /> Before printing
          </p>
          <ul className="mt-1.5 list-disc pl-6 space-y-1">
            {issues.map((issue) => (
              <li key={issue.message}>
                {issue.message}
                {issue.href && (
                  <>
                    {" "}
                    <Link href={issue.href} className="font-semibold underline">
                      {issue.linkLabel}
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {(["front", "back"] as const).map((side) => (
          <figure key={side}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a generated PNG from our own route */}
            <img
              src={`${base}?side=${side}&v=${encodeURIComponent(version)}`}
              alt={`${side === "front" ? "Front" : "Back"} of ${memberName}'s association ID card`}
              width={2022}
              height={1276}
              loading="lazy"
              className="w-full h-auto rounded-xl border border-line shadow-card bg-surface-muted"
            />
            <figcaption className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-slate text-center">
              {side === "front" ? "Front" : "Back"}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
