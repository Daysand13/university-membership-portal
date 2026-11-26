import { type NextRequest } from "next/server";
import { appError, appFieldErrors, appJson, requireAppAudience } from "@/lib/api/app-request";
import { checkRateLimit } from "@/lib/rate-limit";
import { dateInputToDate, supportRequestSchema } from "@/lib/validations/student-portal";
import { createSupportRequest, listSupportRequestsForMember } from "@/lib/services/support-request-service";
import { SUPPORT_REQUEST_TYPES, supportRequestTypeLabel, supportStatusLabel } from "@/lib/portal-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A student's requests for support - assistive technology, a note-taker,
 * welfare - and asking for a new one. The website's own schema, rate limit
 * and service, so the executives see a request from the app exactly as
 * one from the website.
 */

const cedis = (pesewas: number | null) => (pesewas == null ? null : `GH₵ ${(pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`);

export async function GET(request: NextRequest) {
  const auth = await requireAppAudience(request, "MEMBER");
  if ("response" in auth) return auth.response;

  const rows = await listSupportRequestsForMember(auth.actor.member.id);
  return appJson({
    types: SUPPORT_REQUEST_TYPES.map((t) => ({ value: t.value, label: t.label, description: t.description, needsAmount: t.needsAmount })),
    requests: rows.map((r) => ({
      id: r.id,
      type: r.type,
      typeLabel: supportRequestTypeLabel(r.type),
      details: r.details,
      amountRequested: cedis(r.amountRequestedPesewas),
      neededBy: r.neededBy?.toISOString() ?? null,
      status: r.status,
      statusLabel: supportStatusLabel(r.status),
      reviewNote: r.reviewNote,
      approvedAmount: cedis(r.approvedAmountPesewas),
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
  const parsed = supportRequestSchema.safeParse({
    type: body?.type ?? "",
    details: body?.details ?? "",
    amount: body?.amount ?? "",
    neededBy: body?.neededBy ?? "",
  });
  if (!parsed.success) return appFieldErrors(parsed.error.flatten().fieldErrors);

  const limit = await checkRateLimit(`support-request:${member.id}`, { max: 10, windowSeconds: 24 * 3600 });
  if (!limit.allowed) return appError("You've sent several requests today. Please try again tomorrow.", 429, "rate_limited");

  const amount = Number((parsed.data.amount ?? "").replace(/[,\s]/g, ""));
  const created = await createSupportRequest({
    member,
    fields: {
      type: parsed.data.type,
      details: parsed.data.details,
      amountRequestedPesewas:
        parsed.data.type === "WELFARE" && Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null,
      neededBy: parsed.data.neededBy ? dateInputToDate(parsed.data.neededBy) : null,
    },
  });
  return appJson({ id: created.id });
}
