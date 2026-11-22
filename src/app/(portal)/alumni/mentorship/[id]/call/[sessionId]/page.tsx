import { redirect } from "next/navigation";

/**
 * Where a session's "Join the call" used to lead. Calls are no longer tied
 * to a session's time, so this hands over to the mentorship's call page,
 * keeping the session for context. Links in old emails still work.
 */
export default async function MentorSessionCallRedirect({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  redirect(`/alumni/mentorship/${id}/call?session=${encodeURIComponent(sessionId)}`);
}
