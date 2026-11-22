import "server-only";
import { createPrivateKey } from "node:crypto";
import { SignJWT } from "jose";
import { getSiteSettings } from "@/lib/services/content-service";
import { meetingDomainOf, meetingMode, type MeetingSetup } from "@/lib/mentorship-call";
import { callRoomForMentorship } from "@/lib/server/call-room";

/**
 * Everything a browser needs to join a mentorship's call, worked out on the
 * server after the page has checked who is asking.
 *
 * With Jitsi as a Service (8x8) configured, each person gets a pass signed
 * with the association's private key, good for this one room. Nobody
 * without one gets in, however they came by the room's name; the mentor's
 * pass makes them the room's moderator; and the pass turns recording,
 * live streaming and transcription off, so a call can't be recorded from
 * inside it.
 *
 * Set up with three environment variables from the JaaS console
 * (docs/mentorship-calls.md):
 *   JAAS_APP_ID       vpaas-magic-cookie-…
 *   JAAS_API_KEY_ID   vpaas-magic-cookie-…/…   (the key's id)
 *   JAAS_PRIVATE_KEY  the private key, PEM; "\n" for line breaks is fine
 */

export type { MeetingSetup };

const JAAS_DOMAIN = "8x8.vc";
/** Long enough for any conversation; the pass only gets you in the door. */
const PASS_LIFETIME_SECONDS = 8 * 60 * 60;

interface JaasConfig {
  appId: string;
  keyId: string;
  privateKey: string;
}

export function jaasConfig(env: NodeJS.ProcessEnv = process.env): JaasConfig | null {
  const appId = env.JAAS_APP_ID?.trim();
  const keyId = env.JAAS_API_KEY_ID?.trim();
  const privateKey = env.JAAS_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!appId || !keyId || !privateKey) return null;
  return { appId, keyId, privateKey };
}

/** A pass into one JaaS room for one person. Exported for its test. */
export async function jaasPass(params: {
  config: JaasConfig;
  room: string;
  user: { id: string; name: string; avatar?: string | null };
  moderator: boolean;
  now?: Date;
}): Promise<string> {
  const { config, room, user, moderator } = params;
  const now = Math.floor((params.now ?? new Date()).getTime() / 1000);
  // createPrivateKey reads both PKCS#8 and the older "RSA PRIVATE KEY" form.
  const key = createPrivateKey(config.privateKey);
  return new SignJWT({
    room,
    context: {
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar ?? "",
        // Deliberately blank: 8x8 has no need of anybody's email address.
        email: "",
        moderator: moderator ? "true" : "false",
      },
      features: {
        recording: "false",
        livestreaming: "false",
        transcription: "false",
        "outbound-call": "false",
        "sip-outbound-call": "false",
      },
      room: { regex: false },
    },
  })
    .setProtectedHeader({ alg: "RS256", kid: config.keyId, typ: "JWT" })
    .setAudience("jitsi")
    .setIssuer("chat")
    .setSubject(config.appId)
    .setIssuedAt(now)
    .setNotBefore(now - 10)
    .setExpirationTime(now + PASS_LIFETIME_SECONDS)
    .sign(key);
}

export async function meetingFor(params: {
  mentorshipId: string;
  user: { id: string; name: string; avatar?: string | null };
  /** The mentor runs the room. */
  moderator: boolean;
}): Promise<MeetingSetup> {
  const room = callRoomForMentorship(params.mentorshipId);
  const jaas = jaasConfig();
  const settings = await getSiteSettings();
  const domain = meetingDomainOf(settings.meetingDomain);
  const mode = meetingMode(domain, jaas !== null);

  if (mode === "jaas" && jaas) {
    const jwt = await jaasPass({ config: jaas, room, user: params.user, moderator: params.moderator });
    return {
      mode,
      domain: JAAS_DOMAIN,
      scriptUrl: `https://${JAAS_DOMAIN}/${jaas.appId}/external_api.js`,
      roomName: `${jaas.appId}/${room}`,
      jwt,
      joinUrl: `https://${JAAS_DOMAIN}/${jaas.appId}/${room}?jwt=${encodeURIComponent(jwt)}`,
      moderator: params.moderator,
    };
  }

  return {
    mode,
    domain,
    scriptUrl: `https://${domain}/external_api.js`,
    roomName: room,
    jwt: null,
    joinUrl: `https://${domain}/${room}`,
    moderator: false,
  };
}
