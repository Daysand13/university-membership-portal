import { type NextRequest } from "next/server";
import { appError, appFieldErrors, appJson, requireAppActor, requireAppAudience } from "@/lib/api/app-request";
import { checkRateLimit } from "@/lib/rate-limit";
import { opportunitySchema } from "@/lib/validations/alumni-portal";
import { createOpportunity, listOpenOpportunities, listOpportunitiesForAlumni } from "@/lib/services/opportunity-service";
import { OPPORTUNITY_TYPES, opportunityTypeLabel } from "@/lib/portal-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The opportunity board: jobs, internships, scholarships and volunteering
 * that graduates post for students and each other, shown once an
 * administrator has approved them and until they close.
 *
 * Students and graduates both read it; a graduate also sees what they have
 * posted and where each stands, and can post a new one - into the same
 * review queue as the website's form, under the same rules.
 */

type Row = Awaited<ReturnType<typeof listOpenOpportunities>>[number];

function shape(o: Row) {
  return {
    id: o.id,
    title: o.title,
    organization: o.organization,
    type: o.type,
    typeLabel: opportunityTypeLabel(o.type),
    location: o.location,
    description: o.description,
    applyUrl: o.applyUrl,
    applyEmail: o.applyEmail,
    closingDate: o.closingDate?.toISOString() ?? null,
    postedBy: o.postedByName,
    postedAt: o.createdAt.toISOString(),
  };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Waiting for approval",
  APPROVED: "On the board",
  REJECTED: "Not approved",
};

export async function GET(request: NextRequest) {
  const auth = await requireAppActor(request);
  if ("response" in auth) return auth.response;
  const { actor } = auth;
  if (actor.audience === "PATRON") return appError("The opportunity board is for students and graduates.", 403, "wrong_portal");

  const [open, mine] = await Promise.all([
    listOpenOpportunities(),
    actor.audience === "ALUMNI" ? listOpportunitiesForAlumni(actor.alumni.id) : Promise.resolve([]),
  ]);
  return appJson({
    canPost: actor.audience === "ALUMNI",
    types: OPPORTUNITY_TYPES.map((t) => ({ value: t.value, label: t.label })),
    opportunities: open.map(shape),
    mine: mine.map((o) => ({
      ...shape(o),
      status: o.status,
      statusLabel: STATUS_LABELS[o.status] ?? o.status,
      reviewNote: o.reviewNote,
      canWithdraw: o.status === "PENDING",
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAppAudience(request, "ALUMNI");
  if ("response" in auth) return auth.response;
  const { alumni } = auth.actor;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = opportunitySchema.safeParse({
    title: body?.title ?? "",
    organization: body?.organization ?? "",
    type: body?.type ?? "",
    location: body?.location ?? "",
    description: body?.description ?? "",
    applyUrl: body?.applyUrl ?? "",
    applyEmail: body?.applyEmail ?? "",
    closingDate: body?.closingDate ?? "",
  });
  if (!parsed.success) return appFieldErrors(parsed.error.flatten().fieldErrors);

  const limit = await checkRateLimit(`alumni-opportunity:${alumni.id}`, { max: 10, windowSeconds: 24 * 3600 });
  if (!limit.allowed) return appError("You've posted several openings today. Please try again tomorrow.", 429, "rate_limited");

  const blank = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
  const created = await createOpportunity({
    alumni,
    fields: {
      title: parsed.data.title,
      organization: parsed.data.organization,
      type: parsed.data.type,
      location: blank(parsed.data.location),
      description: parsed.data.description,
      applyUrl: blank(parsed.data.applyUrl),
      applyEmail: blank(parsed.data.applyEmail),
      closingDate: parsed.data.closingDate ? new Date(`${parsed.data.closingDate}T23:59:59Z`) : null,
    },
  });
  return appJson({ id: created.id });
}
