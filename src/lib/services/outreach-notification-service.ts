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

export async function notifyAdminsOfTechRequest(request: {
  id: string;
  kind: "SOFTWARE" | "TUTORIAL";
  fullName: string;
  topic: string;
  category: string;
  operatingSystem: string | null;
}): Promise<void> {
  const isTutorial = request.kind === "TUTORIAL";
  const heading = isTutorial ? "Tutorial request" : "Software request";
  const path = `/admin/tech-tutorials/requests/${request.id}`;

  await notifyAdmins({
    roles: ["MEMBERSHIP_OFFICER", "EDITOR"],
    template: isTutorial ? "admin-tutorial-request" : "admin-software-request",
    entityType: "SoftwareRequest",
    entityId: request.id,
    bell: {
      type: "SYSTEM",
      title: `${heading}: ${request.topic}`,
      body: `From ${request.fullName}`,
      link: path,
    },
    build: () => ({
      subject: `${heading}: ${request.topic}`,
      paragraphs: [
        isTutorial
          ? "Someone has asked for a walk-through the Tech & Tutorials page doesn't cover yet."
          : "Someone has asked for a tool that isn't in the Telegram library yet.",
      ],
      details: [
        { label: "From", value: request.fullName },
        { label: isTutorial ? "Tutorial" : "Software", value: request.topic },
        { label: "For", value: softwareCategoryLabel(request.category) },
        ...(request.operatingSystem ? [{ label: "On", value: request.operatingSystem }] : []),
      ],
      cta: { path, label: "Open the Request" },
    }),
  });
}

