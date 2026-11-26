import { type NextRequest } from "next/server";
import { z } from "zod";
import { appFieldErrors, appJson, requireAppAudience } from "@/lib/api/app-request";
import { checkRateLimit } from "@/lib/rate-limit";
import { updateMemberProfile } from "@/lib/services/membership-service";
import { formatFullName } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A student's own profile: what is on their record, and the contact details
 * they may change themselves - the same five fields as the website's
 * profile form, through the same service, which emails them a note of what
 * changed. Everything else on the record (name, index number, programme)
 * is the association's to correct, as on the website.
 */

function profileOf(m: {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  indexNumber: string;
  email: string;
  phone: string;
  programme: string;
  level: string;
  campus: string;
  department: string;
  status: string;
  residentialAddress: string | null;
  region: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}) {
  return {
    name: formatFullName(m.firstName, m.middleName, m.lastName),
    indexNumber: m.indexNumber,
    email: m.email,
    programme: m.programme,
    level: m.level,
    campus: m.campus,
    specialNeedsCategory: m.department,
    status: m.status,
    editable: {
      phone: m.phone ?? "",
      residentialAddress: m.residentialAddress ?? "",
      region: m.region ?? "",
      emergencyContactName: m.emergencyContactName ?? "",
      emergencyContactPhone: m.emergencyContactPhone ?? "",
    },
  };
}

const text = (max: number) => z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string().max(max, `Keep it under ${max} characters`));

const schema = z.object({
  phone: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, "Phone number is required").max(30, "That doesn't look like a phone number"),
  ),
  residentialAddress: text(300),
  region: text(80),
  emergencyContactName: text(120),
  emergencyContactPhone: text(30),
});

export async function GET(request: NextRequest) {
  const auth = await requireAppAudience(request, "MEMBER");
  if ("response" in auth) return auth.response;
  return appJson({ profile: profileOf(auth.actor.member) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAppAudience(request, "MEMBER");
  if ("response" in auth) return auth.response;
  const { member } = auth.actor;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return appFieldErrors(parsed.error.flatten().fieldErrors);

  const limit = await checkRateLimit(`app-profile:${member.id}`, { max: 30, windowSeconds: 3600 });
  if (!limit.allowed) return appFieldErrors({ phone: ["You've saved a lot of changes in a short time. Please wait a while."] });

  const updated = await updateMemberProfile(member.id, parsed.data);
  return appJson({ profile: profileOf(updated) });
}
