import Link from "next/link";
import { FileAudio, FileText, ImageIcon, Paperclip } from "lucide-react";
import { BARRIER_STAGES, barrierStageIndex, barrierStatusLabel, isAudioType } from "@/lib/portal-options";
import { formatFileSize } from "@/lib/patron-portal-options";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

export { dateFormat as reportDateFormat, dateTimeFormat as reportDateTimeFormat };

/**
 * Where a report has got to, as four steps the student can see at a glance.
 *
 * Deliberately not a percentage or a bare status word: the point of the
 * tracker is that somebody who reported a locked lift three weeks ago can
 * tell whether anyone has picked it up, without having to ask.
 */
export function BarrierTracker({ status }: { status: string }) {
  const closed = status === "CLOSED";
  const current = barrierStageIndex(status);

  return (
    <div>
      <ol className="flex flex-wrap gap-y-3" aria-label="Progress">
        {BARRIER_STAGES.map((stage, index) => {
          const done = !closed && index <= current;
          const isCurrent = !closed && index === current;
          return (
            <li key={stage.value} className="flex items-center gap-2 pr-3">
              <span
                aria-hidden="true"
                className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold ${
                  done ? "bg-primary-800 text-white" : "bg-surface-muted text-slate border border-line"
                }`}
              >
                {index + 1}
              </span>
              <span className={`text-sm ${isCurrent ? "font-semibold text-primary-950" : "text-slate"}`}>
                {stage.label}
                {isCurrent && <span className="sr-only"> — current stage</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-slate">
        {closed
          ? "This report was closed without being resolved. The note below explains why."
          : BARRIER_STAGES[current]?.detail}
      </p>
    </div>
  );
}

/** The plain-language status word used in lists. */
export function BarrierStatusText({ status }: { status: string }) {
  const tone =
    status === "RESOLVED"
      ? "text-success"
      : status === "ESCALATED"
        ? "text-accent-700"
        : status === "CLOSED"
          ? "text-slate"
          : "text-primary-800";
  return <span className={`text-sm font-semibold ${tone}`}>{barrierStatusLabel(status)}</span>;
}

export interface EvidenceItem {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * The files attached to a report. Each opens through a signed link that only
 * the student who filed it and the executives can use.
 */
export function EvidenceList({ items }: { items: EvidenceItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const audio = isAudioType(item.mimeType);
        const image = item.mimeType.startsWith("image/");
        return (
          <li key={item.id}>
            <Link
              href={`/api/report-evidence/${item.id}`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-3 rounded-lg border border-line px-3.5 py-2.5 min-h-12 hover:border-primary-600 hover:bg-surface-muted"
            >
              <span aria-hidden="true" className="text-primary-800 shrink-0">
                {audio ? <FileAudio size={18} /> : image ? <ImageIcon size={18} /> : <FileText size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-primary-950 truncate">{item.fileName}</span>
                <span className="block text-xs text-slate">
                  {audio ? "Voice note" : image ? "Photo" : "Document"} · {formatFileSize(item.fileSize)}
                </span>
              </span>
              <Paperclip size={15} aria-hidden="true" className="text-slate shrink-0" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export interface ReportUpdateItem {
  id: string;
  authorName: string;
  body: string;
  status: string | null;
  createdAt: Date;
}

/** Everything written on a report since it was filed, oldest first. */
export function ReportUpdates({ items, filedAt }: { items: ReportUpdateItem[]; filedAt: Date }) {
  return (
    <ol className="relative border-l border-line ml-2 space-y-5">
      <li className="ml-5">
        <span aria-hidden="true" className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-primary-800" />
        <p className="text-sm font-semibold text-primary-950">You filed this report</p>
        <p className="text-xs text-slate">{dateTimeFormat.format(filedAt)}</p>
      </li>
      {items.map((update) => (
        <li key={update.id} className="ml-5">
          <span aria-hidden="true" className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-accent-500" />
          <p className="text-sm font-semibold text-primary-950">
            {update.status ? barrierStatusLabel(update.status) : "Update"}
            <span className="font-normal text-slate"> · {update.authorName}</span>
          </p>
          <p className="text-xs text-slate">{dateTimeFormat.format(update.createdAt)}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink whitespace-pre-line">{update.body}</p>
        </li>
      ))}
    </ol>
  );
}
