import { type NextRequest } from "next/server";
import { appJson, requireAppActor } from "@/lib/api/app-request";
import {
  listAllAnnouncements,
  listAnnouncementsForAlumni,
  listAnnouncementsForMember,
} from "@/lib/services/broadcast-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The announcements this person is meant to see.
 *
 * Which ones those are is decided by the same three service calls the
 * portals make, not by anything the app sends: a student sees what
 * students are sent, plus the executive's own if they sit on it. Asking
 * from a phone cannot widen that.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAppActor(request);
  if ("response" in auth) return auth.response;
  const { actor } = auth;

  const announcements =
    actor.audience === "MEMBER"
      ? await listAnnouncementsForMember(actor.member.id)
      : actor.audience === "ALUMNI"
        ? await listAnnouncementsForAlumni()
        : await listAllAnnouncements();

  return appJson({
    announcements: announcements.map((row) => ({
      id: row.id,
      subject: row.subject,
      bodyHtml: row.bodyHtml,
      authorName: row.authorName,
      audience: row.audience,
      sentAt: row.sentAt ? row.sentAt.toISOString() : null,
      // The file itself comes through the website's own authorised route,
      // so nothing here hands out a link that skips the check.
      attachmentName: row.attachmentName,
      attachmentUrl: row.attachmentName ? `/api/broadcasts/${row.id}/attachment` : null,
    })),
  });
}
