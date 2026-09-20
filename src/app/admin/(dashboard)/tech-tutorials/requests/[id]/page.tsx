import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Inbox, UserRound } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getTechRequest } from "@/lib/services/assistive-software-service";
import { SoftwareRequestUpdateForm } from "@/components/admin/forms/OutreachForms";
import { SOFTWARE_REQUEST_STATUS_LABELS, softwareCategoryLabel } from "@/lib/outreach-options";

export const metadata = { title: "Request" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

export default async function SoftwareRequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("outreach.software.requests");
  const { id } = await params;
  const request = await getTechRequest(id);
  if (!request) notFound();

  return (
    <div className="max-w-5xl">
      <Link
        href="/admin/tech-tutorials/requests"
        className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4"
      >
        <ChevronLeft size={16} aria-hidden="true" /> Requests
      </Link>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">{request.topic}</h1>
      <p className="text-sm text-slate mb-6">
        {request.kind === "TUTORIAL" ? "Tutorial request" : "Software request"} ·{" "}
        {SOFTWARE_REQUEST_STATUS_LABELS[request.status]} · asked {dateFormat.format(request.createdAt)}
        {request.handledBy && ` · last updated by ${request.handledBy.name}`}
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
              <Inbox size={18} aria-hidden="true" /> The request
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-slate">{request.kind === "TUTORIAL" ? "Tutorial" : "Software"}</dt>
                <dd className="font-semibold text-primary-950">{request.topic}</dd>
              </div>
              <div>
                <dt className="text-slate">Helps with</dt>
                <dd className="font-semibold text-primary-950">{softwareCategoryLabel(request.category)}</dd>
              </div>
              {request.operatingSystem && (
                <div>
                  <dt className="text-slate">Operating system</dt>
                  <dd className="font-semibold text-primary-950">{request.operatingSystem}</dd>
                </div>
              )}
            </dl>
            {request.notes && (
              <div className="mt-4">
                <p className="text-sm text-slate">Notes</p>
                <p className="mt-1 whitespace-pre-line text-ink">{request.notes}</p>
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="font-display font-bold text-base text-primary-950 mb-4">Update</h2>
            <SoftwareRequestUpdateForm
              requestId={request.id}
              kind={request.kind}
              status={request.status}
              adminNote={request.adminNote}
              resourceLink={request.resourceLink}
            />
          </section>
        </div>

        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
            <UserRound size={18} aria-hidden="true" /> Who asked
          </h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate">Name</dt>
              <dd className="font-semibold text-primary-950">{request.fullName}</dd>
            </div>
            <div>
              <dt className="text-slate">Email</dt>
              <dd className="text-primary-950 break-all">
                <a href={`mailto:${request.email}`} className="hover:text-accent-600">
                  {request.email}
                </a>
              </dd>
            </div>
            {request.member && (
              <div>
                <dt className="text-slate">Student record</dt>
                <dd>
                  <Link href={`/admin/members/${request.member.id}`} className="font-semibold text-primary-800 hover:text-accent-600">
                    {request.member.firstName} {request.member.lastName} ({request.member.indexNumber})
                  </Link>
                </dd>
              </div>
            )}
          </dl>
          {!request.member && (
            <p className="mt-3 text-xs text-slate">Sent without signing in, so it isn&apos;t linked to a student record.</p>
          )}
        </section>
      </div>
    </div>
  );
}
