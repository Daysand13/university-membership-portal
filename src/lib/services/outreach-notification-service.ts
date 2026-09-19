import "server-only";
import { notifyAdmins } from "@/lib/services/portal-notification-service";
import { softwareCategoryLabel } from "@/lib/outreach-options";

/**
 * Admin alerts for the public outreach pages: a confirmed ally sign-up, and
 * a request for a piece of assistive software. Best-effort, like every other
 * notice — the sign-up or request is saved whether or not these go out.
 */

export async function notifyAdminsOfAllySignup(signup: {
  id: string;
  fullName: string;
  email: string;
  type: string;
  organization: string | null;
  wantsListing: boolean;
}): Promise<void> {
  const who = signup.organization ? `${signup.fullName} (${signup.organization})` : signup.fullName;
  await notifyAdmins({
    roles: ["MEMBERSHIP_OFFICER", "EDITOR"],
    template: "admin-ally-signup",
    entityType: "AllySignup",
    entityId: signup.id,
    bell: {
      type: "SYSTEM",
      title: signup.wantsListing ? `New ally asks to be listed: ${who}` : `New ally joined: ${who}`,
      link: "/admin/allies/signups",
    },
    build: () => ({
      subject: signup.wantsListing ? `New ally asks to be listed publicly: ${who}` : `New ally joined the network: ${who}`,
      paragraphs: [
        signup.wantsListing
          ? "Someone has joined the ally network and asked to be listed on the Allies & Champions page. Nothing appears on the page until an administrator adds them."
          : "Someone has joined the ally network. They'll receive broadcasts sent to Allies.",
      ],
      details: [
        { label: "Name", value: signup.fullName },
        { label: "Email", value: signup.email },
        { label: "Joining as", value: signup.type === "CORPORATE" ? "Corporate representative" : "Individual" },
        ...(signup.organization ? [{ label: "Organisation / role", value: signup.organization }] : []),
      ],
      cta: { path: "/admin/allies/signups", label: "Open Ally Sign-ups" },
    }),
  });
}

export async function notifyAdminsOfSoftwareRequest(request: {
  id: string;
  fullName: string;
  softwareName: string;
  category: string;
  operatingSystem: string;
}): Promise<void> {
  await notifyAdmins({
    roles: ["MEMBERSHIP_OFFICER", "EDITOR"],
    template: "admin-software-request",
    entityType: "SoftwareRequest",
    entityId: request.id,
    bell: {
      type: "SYSTEM",
      title: `Software request: ${request.softwareName}`,
      body: `From ${request.fullName}`,
      link: `/admin/assistive-tech/requests/${request.id}`,
    },
    build: () => ({
      subject: `Software request: ${request.softwareName}`,
      paragraphs: ["Someone has asked for a tool that isn't in the Telegram library yet."],
      details: [
        { label: "From", value: request.fullName },
        { label: "Software", value: request.softwareName },
        { label: "For", value: softwareCategoryLabel(request.category) },
        { label: "On", value: request.operatingSystem },
      ],
      cta: { path: `/admin/assistive-tech/requests/${request.id}`, label: "Open the Request" },
    }),
  });
}
