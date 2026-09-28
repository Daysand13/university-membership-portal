import "server-only";
import { SignJWT, importPKCS8 } from "jose";
import { batches, isDeadToken, type PushMessage } from "@/lib/push/message";

/**
 * Talking to Firebase Cloud Messaging.
 *
 * Google's own SDK would pull in a large dependency to do two HTTP calls,
 * so this does them: sign a short-lived assertion with the service
 * account's key, trade it for an access token, and post one message per
 * address.
 *
 * The service account's private key lives in the environment, never in the
 * app and never in this repository. The only thing the phone ever holds is
 * its own address, which is useless to anybody else.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function serviceAccount(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Pasted into a dashboard, the newlines in a PEM key arrive escaped.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

export function isPushConfigured(): boolean {
  return serviceAccount() !== null;
}

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(account: ServiceAccount): Promise<string> {
  // Google's tokens last an hour; asking for a new one per notification
  // would double every send and get us rate-limited for no reason.
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const key = await importPKCS8(account.privateKey, "RS256");
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(account.clientEmail)
    .setSubject(account.clientEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Firebase refused the service account (${response.status}).`);
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  cached = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return body.access_token;
}

export interface SendResult {
  sent: number;
  failed: number;
  /** Addresses that will never work again and should be forgotten. */
  deadTokens: string[];
}

/**
 * Sends one message to many phones.
 *
 * FCM's v1 API takes a single address per call, so these go out in batches
 * of parallel requests rather than one multicast. A failure never throws:
 * a notification not arriving must not take down whatever published the
 * article.
 */
export async function sendPush(tokens: string[], message: PushMessage): Promise<SendResult> {
  const account = serviceAccount();
  if (!account || tokens.length === 0) return { sent: 0, failed: 0, deadTokens: [] };

  let auth: string;
  try {
    auth = await accessToken(account);
  } catch (err) {
    console.error("[push] could not authenticate with Firebase", err);
    return { sent: 0, failed: tokens.length, deadTokens: [] };
  }

  const endpoint = `https://fcm.googleapis.com/v1/projects/${account.projectId}/messages:send`;
  const result: SendResult = { sent: 0, failed: 0, deadTokens: [] };

  for (const batch of batches(tokens, 100)) {
    const outcomes = await Promise.all(
      batch.map(async (token) => {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: message.title, body: message.body },
                // The app reads this to open the right screen when tapped.
                data: { path: message.path },
                android: { priority: "normal", notification: { channel_id: "assn-updates" } },
              },
            }),
          });

          if (response.ok) return { ok: true as const };

          const body = (await response.json().catch(() => null)) as
            | { error?: { status?: string; message?: string } }
            | null;
          return { ok: false as const, token, code: body?.error?.status ?? String(response.status) };
        } catch {
          // A network blip: the address may be perfectly good.
          return { ok: false as const, token, code: null };
        }
      }),
    );

    for (const outcome of outcomes) {
      if (outcome.ok) result.sent += 1;
      else {
        result.failed += 1;
        if (isDeadToken(outcome.code)) result.deadTokens.push(outcome.token);
      }
    }
  }

  return result;
}
