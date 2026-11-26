import { type NextRequest } from "next/server";
import { appError, appFieldErrors, appJson, requireAppAudience } from "@/lib/api/app-request";
import { checkRateLimit } from "@/lib/rate-limit";
import { barrierReportSchema, dateInputToDate, evidenceTokensSchema } from "@/lib/validations/student-portal";
import { createBarrierReport, listReportsForMember } from "@/lib/services/barrier-report-service";
import { adoptBarrierEvidenceUpload, EnrollmentUploadError } from "@/lib/services/enrollment-upload-service";
import { barrierStatusLabel, MAX_BARRIER_EVIDENCE_FILES } from "@/lib/portal-options";
import { ISSUE_CATEGORIES, issueCategoryLabel } from "@/lib/patron-portal-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A student's reports of barriers on campus, and filing a new one - with a
 * photo or document as evidence if they have one. The website's schema,
 * rate limit and service; evidence arrives as the same signed upload
 * tickets the website uses (see ./upload), checked again here before the
 * report is saved.
 */

export async function GET(request: NextRequest) {
  const auth = await requireAppAudience(request, "MEMBER");
  if ("response" in auth) return auth.response;

  const reports = await listReportsForMember(auth.actor.member.id);
  return appJson({
    categories: ISSUE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
    maxEvidence: MAX_BARRIER_EVIDENCE_FILES,
    reports: reports.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      categoryLabel: issueCategoryLabel(r.category),
      location: r.location,
      occurredOn: r.occurredOn?.toISOString() ?? null,
      status: r.status,
      statusLabel: barrierStatusLabel(r.status),
      resolutionNote: r.resolutionNote,
      attachments: r._count.attachments,
      createdAt: r.createdAt.toISOString(),
      canWithdraw: r.status === "SUBMITTED",
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAppAudience(request, "MEMBER");
  if ("response" in auth) return auth.response;
  const { member } = auth.actor;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = barrierReportSchema.safeParse({
    title: body?.title ?? "",
    description: body?.description ?? "",
    category: body?.category ?? "",
    location: body?.location ?? "",
    occurredOn: body?.occurredOn ?? "",
  });
  if (!parsed.success) return appFieldErrors(parsed.error.flatten().fieldErrors);
  const tickets = evidenceTokensSchema.safeParse(body?.evidence ?? []);
  if (!tickets.success) return appFieldErrors({ evidence: [`Attach up to ${MAX_BARRIER_EVIDENCE_FILES} files.`] });

  const limit = await checkRateLimit(`barrier-report:${member.id}`, { max: 10, windowSeconds: 24 * 3600 });
  if (!limit.allowed) return appError("You've filed several reports today. Please try again tomorrow.", 429, "rate_limited");

  const evidence = [];
  try {
    for (const ticket of tickets.data) {
      const upload = await adoptBarrierEvidenceUpload(ticket.token);
      if (upload) {
        evidence.push({
          objectKey: upload.objectKey,
          fileName: ticket.name.slice(0, 200),
          mimeType: upload.mimeType,
          fileSize: upload.fileSize,
        });
      }
    }
  } catch (err) {
    if (err instanceof EnrollmentUploadError) return appFieldErrors({ evidence: [err.message] });
    throw err;
  }

  const report = await createBarrierReport({
    member,
    fields: {
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      location: parsed.data.location?.trim() ? parsed.data.location.trim() : null,
      occurredOn: parsed.data.occurredOn ? dateInputToDate(parsed.data.occurredOn) : null,
    },
    evidence,
  });
  return appJson({ id: report.id, attachments: evidence.length });
}
