import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { db } from "@/lib/db";

/**
 * The QR code on a member's digital membership card, and the public page it
 * opens, where event staff can confirm the card belongs to a current member.
 *
 * The code is a signed link, not a member ID: it can't be guessed or edited
 * into someone else's, and it proves nothing unless we issued it. It expires
 * at the end of the academic year it was issued in (1 August — the same
 * cutover dues use), so a screenshot doesn't stay valid forever; the
 * dashboard simply shows a fresh one. What it reveals is deliberately what a
 * printed membership card would: name, photo, index number and whether the
 * membership is active — never contact details or support needs.
 */

const PURPOSE = "member-card-v1";

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set — required to sign membership card codes.");
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", signingSecret()).update(`${PURPOSE}.${body}`).digest("base64url");
}

function endOfAcademicYear(now: Date): number {
  const year = now.getUTCFullYear();
  const startYear = now.getUTCMonth() >= 7 ? year : year - 1; // 7 = August
  return Date.UTC(startYear + 1, 7, 1);
}

export function createMemberCardToken(memberId: string, now: Date = new Date()): string {
  const body = Buffer.from(JSON.stringify({ m: memberId, exp: endOfAcademicYear(now) })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readMemberCardToken(token: string, now: number = Date.now()): { memberId: string } | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const provided = Buffer.from(token.slice(separator + 1));
  const expected = Buffer.from(sign(body));
  // Length first: timingSafeEqual throws on a length mismatch.
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as { m?: unknown; exp?: unknown };
    if (typeof payload.m !== "string" || typeof payload.exp !== "number" || payload.exp < now) return null;
    return { memberId: payload.m };
  } catch {
    return null;
  }
}

/** The address the phone scanning the code should open — this deployment's own. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ?? "";
}

export async function getMemberCardQr(memberId: string): Promise<{ url: string; svg: string }> {
  const url = `${await siteOrigin()}/membership/verify/${createMemberCardToken(memberId)}`;
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    // Explicit colours: a QR code needs dark-on-light to scan, whatever
    // theme the page around it is in.
    color: { dark: "#14153dff", light: "#ffffffff" },
  });
  return { url, svg };
}

export async function getMemberForCardVerification(token: string) {
  const payload = readMemberCardToken(token);
  if (!payload) return null;
  return db.member.findUnique({
    where: { id: payload.memberId },
    select: {
      firstName: true,
      middleName: true,
      lastName: true,
      indexNumber: true,
      status: true,
      graduatedAt: true,
      profileImageUrl: true,
    },
  });
}
