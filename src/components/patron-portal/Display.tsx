import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, Megaphone, Paperclip } from "lucide-react";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { RichText } from "@/components/ui/RichText";
import { ISSUE_STAGES } from "@/lib/patron-portal-options";

/** A headline number: label, value, and an optional line of context. */
export function StatTile({
  label,
  value,
  detail,
  icon,
  href,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate">{label}</p>
        <span aria-hidden="true" className="w-9 h-9 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
          {icon}
        </span>
      </div>
      <p className="mt-2 font-display font-bold text-xl sm:text-2xl xl:text-[1.75rem] leading-tight text-primary-950 break-words">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate">{detail}</p>}
    </>
  );
  const classes = "block bg-white rounded-xl border border-line shadow-card p-4 sm:p-5 min-w-0";
  return href ? (
    <Link href={href} className={`${classes} hover:border-primary-400 transition-colors`}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

/**
 * Where an escalated issue is: Submitted → Under Executive Review → Patron
 * Action Taken → Resolved. Each stage is labelled and marked with a tick or
 * a number, so the stage never depends on colour.
 */
export function IssueStageTracker({ status, compact = false }: { status: string; compact?: boolean }) {
  const current = Math.max(0, ISSUE_STAGES.findIndex((stage) => stage.value === status));
  return (
    <ol className={`flex ${compact ? "gap-1" : "flex-col sm:flex-row gap-2 sm:gap-0"}`} aria-label="Progress">
      {ISSUE_STAGES.map((stage, i) => {
        const done = i < current || (i === current && stage.value === "RESOLVED");
        const isCurrent = i === current;
        if (compact) {
          return (
            <li
              key={stage.value}
              className={`h-1.5 flex-1 rounded-full ${i <= current ? "bg-primary-800" : "bg-line"}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="sr-only">
                {stage.label}
                {isCurrent ? " (current stage)" : i < current ? " (done)" : ""}
              </span>
            </li>
          );
        }
        return (
          <li
            key={stage.value}
            aria-current={isCurrent ? "step" : undefined}
            className="flex sm:flex-col items-center gap-2.5 sm:gap-1.5 sm:flex-1 sm:text-center relative"
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`hidden sm:block absolute top-4 right-1/2 w-full h-0.5 -z-0 ${i <= current ? "bg-primary-800" : "bg-line"}`}
              />
            )}
            <span
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                done
                  ? "bg-primary-800 text-white"
                  : isCurrent
                    ? "bg-accent-500 text-primary-950 ring-4 ring-accent-100"
                    : "bg-white border-2 border-line text-slate"
              }`}
            >
              {done ? <Check size={16} aria-hidden="true" /> : i + 1}
            </span>
            <span className={`text-sm ${isCurrent ? "font-bold text-primary-950" : "text-slate"}`}>
              {stage.label}
              {isCurrent && <span className="sr-only"> (current stage)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const announcementDate = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

export interface AnnouncementView {
  id: string;
  subject: string;
  bodyHtml: string;
  authorName: string;
  sentAt: Date | null;
  attachmentKey: string | null;
  attachmentName: string | null;
}

/** Patrons' approved announcements, as students, alumni and patrons see them. */
export function AnnouncementsList({
  announcements,
  collapsed = false,
  emptyText = "There are no announcements yet.",
}: {
  announcements: AnnouncementView[];
  /** Subject lines that expand, for a dashboard card. */
  collapsed?: boolean;
  emptyText?: string;
}) {
  if (announcements.length === 0) return <p className="text-slate">{emptyText}</p>;

  return (
    <ul className={collapsed ? "divide-y divide-line" : "space-y-5"}>
      {announcements.map((a) => {
        const meta = (
          <span className="block text-sm text-slate mt-0.5">
            From {a.authorName}, Patron
            {a.sentAt && <> · {announcementDate.format(a.sentAt)}</>}
          </span>
        );
        const body = (
          <>
            <RichText html={a.bodyHtml} className="mt-3 text-[15px]" />
            {a.attachmentKey && (
              <a
                href={`/api/broadcasts/${a.id}/attachment`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
              >
                <Paperclip size={15} aria-hidden="true" /> {a.attachmentName ?? "Attachment"}
              </a>
            )}
          </>
        );
        return collapsed ? (
          <li key={a.id} className="py-2.5 first:pt-0">
            <details>
              <summary className="cursor-pointer list-none">
                <span className="font-semibold text-primary-950 hover:text-accent-600">{a.subject}</span>
                {meta}
              </summary>
              {body}
            </details>
          </li>
        ) : (
          <li key={a.id} className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
            <h2 className="font-display font-bold text-lg text-primary-950">{a.subject}</h2>
            {meta}
            {body}
          </li>
        );
      })}
    </ul>
  );
}

/** The latest patron announcements on a student or alumni dashboard. */
export function AnnouncementsCard({ announcements, href }: { announcements: AnnouncementView[]; href: string }) {
  return (
    <DashboardCard
      id="announcements"
      title="Announcements from Patrons"
      icon={<Megaphone size={20} />}
      readAloud
      footer={
        <Link href={href} className="inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600">
          All announcements <ArrowRight size={14} aria-hidden="true" />
        </Link>
      }
    >
      <AnnouncementsList announcements={announcements} collapsed />
    </DashboardCard>
  );
}
