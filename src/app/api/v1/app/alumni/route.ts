import { type NextRequest } from "next/server";
import { appJson, requireAppActor } from "@/lib/api/app-request";
import { searchAlumniDirectory } from "@/lib/services/alumni-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The alumni directory — for people who are signed in, as on the website.
 *
 * searchAlumniDirectory returns only ACTIVE graduates who left
 * directoryVisible on. A graduate who took themselves out of the
 * directory is out of it here too.
 *
 * Note what is deliberately absent: no email address and no phone number.
 * A directory a whole association can open on a phone is a directory
 * somebody will eventually export, and what that should yield is names and
 * professions, not a contact list. Getting in touch goes through
 * mentorship, which both sides have agreed to.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAppActor(request);
  if ("response" in auth) return auth.response;

  const query = request.nextUrl.searchParams.get("q")?.trim() || undefined;
  const alumni = await searchAlumniDirectory(query);

  return appJson({
    alumni: alumni.map((row) => ({
      id: row.id,
      name: row.fullName,
      programme: row.programme,
      graduationYear: row.graduationYear,
      profession: row.profession,
      currentPosition: row.currentPosition,
      currentOrganization: row.currentOrganization,
      location: row.currentLocation,
      photoUrl: row.profileImageUrl,
      willingToMentor: row.willingToMentor,
      // Only where the graduate opted into appearing on the open web.
      publicSlug: row.publicProfile ? row.publicSlug : null,
    })),
    total: alumni.length,
  });
}
