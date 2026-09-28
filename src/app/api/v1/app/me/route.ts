import { type NextRequest } from "next/server";
import { appJson, requireAppActor } from "@/lib/api/app-request";
import { formatFullName } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who is signed in, as the app needs to show them.
 *
 * Deliberately a short list. The app's home screen wants a name, a photo
 * and a status; it does not want a member's medical report, and a field
 * added to the record later should not arrive here on its own.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAppActor(request);
  if ("response" in auth) return auth.response;
  const { actor } = auth;

  if (actor.audience === "MEMBER") {
    const m = actor.member;
    return appJson({
      audience: "MEMBER",
      profile: {
        id: m.id,
        name: formatFullName(m.firstName, m.middleName, m.lastName),
        indexNumber: m.indexNumber,
        email: m.email,
        phone: m.phone,
        programme: m.programme,
        level: m.level,
        campus: m.campus,
        department: m.department,
        membershipType: m.membershipType,
        status: m.status,
        photoUrl: m.profileImageUrl,
        joinedAt: m.createdAt.toISOString(),
        mustChangePassword: m.mustChangePassword,
      },
    });
  }

  if (actor.audience === "ALUMNI") {
    const a = actor.alumni;
    return appJson({
      audience: "ALUMNI",
      profile: {
        id: a.id,
        name: a.fullName,
        email: a.email,
        phone: a.phone,
        programme: a.programme,
        graduationYear: a.graduationYear,
        profession: a.profession,
        currentPosition: a.currentPosition,
        currentOrganization: a.currentOrganization,
        location: a.currentLocation,
        status: a.status,
        photoUrl: a.profileImageUrl,
        willingToMentor: a.willingToMentor,
      },
    });
  }

  const p = actor.patron;
  return appJson({
    audience: "PATRON",
    profile: {
      id: p.id,
      name: [p.title, p.fullName].filter(Boolean).join(" "),
      email: p.email,
      phone: p.phone,
      occupation: p.occupation,
      organization: p.organization,
      status: p.status,
    },
  });
}
