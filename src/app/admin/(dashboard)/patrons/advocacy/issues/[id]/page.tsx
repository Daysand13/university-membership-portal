import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getIssue } from "@/lib/services/advocacy-service";
import { deleteIssueAction } from "@/lib/actions/patron-admin-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { IssueForm } from "@/components/admin/forms/AdvocacyForms";
import { issueActionLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "Escalated Issue" };
export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Accra" });

export default async function AdminIssuePage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("members.patrons");
  const { id } = await params;
  const issue = await getIssue(id);
  if (!issue) notFound();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-5xl">
      <Link href="/admin/patrons/advocacy" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Advocacy
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">{issue.title}</h1>
        <ConfirmButton
          action={deleteIssueAction.bind(null, issue.id)}
          confirmMessage="Delete this issue and the patrons' actions on it? This can't be undone."
          className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-light"
        >
          <Trash2 size={14} aria-hidden="true" /> Delete
        </ConfirmButton>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <section className="bg-white rounded-lg border border-line p-6">
          <IssueForm
            today={today}
            issue={{
              id: issue.id,
              title: issue.title,
              summary: issue.summary,
              category: issue.category,
              location: issue.location,
              status: issue.status,
              reportedOn: issue.reportedOn.toISOString().slice(0, 10),
              resolutionNote: issue.resolutionNote,
            }}
          />
        </section>

        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="font-display font-bold text-base text-primary-950 mb-3">Patron Actions ({issue.actions.length})</h2>
          {issue.actions.length === 0 ? (
            <p className="text-sm text-slate">No patron has acted on this issue yet.</p>
          ) : (
            <ol className="space-y-4">
              {issue.actions.map((action) => (
                <li key={action.id} className="border-l-2 border-accent-500 pl-3">
                  <p className="text-sm font-semibold text-primary-950">{issueActionLabel(action.type)}</p>
                  <p className="text-xs text-slate">
                    <Link href={`/admin/patrons/${action.patron.id}`} className="font-semibold text-primary-800 hover:text-accent-600">
                      {[action.patron.title, action.patron.fullName].filter(Boolean).join(" ")}
                    </Link>{" "}
                    · {action.patron.email} · {action.patron.phone} · {dateTime.format(action.createdAt)}
                  </p>
                  <p className="text-sm text-ink whitespace-pre-line mt-1">{action.message}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
