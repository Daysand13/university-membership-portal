import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { AppAudience, MobileDevice } from "@/generated/prisma/client";
import {
  REFRESH_TOKEN_DAYS,
  createAccessToken,
  hashRefreshToken,
  mintRefreshToken,
} from "@/lib/auth/app-token";

/**
 * The phones people are signed in on.
 *
 * One row per sign-in, not per person: somebody with a phone and a tablet
 * has two, and losing one should not sign them out of the other.
 */

export interface AppSession {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  deviceId: string;
}

export interface DeviceDescription {
  deviceName?: string | null;
  appVersion?: string | null;
  androidSdk?: number | null;
}

function ownerColumn(audience: AppAudience, id: string) {
  if (audience === "MEMBER") return { memberId: id };
  if (audience === "ALUMNI") return { alumniProfileId: id };
  return { patronId: id };
}

/** Signs a phone in: a new device row, and the pair of tokens for it. */
export async function startAppSession(params: {
  audience: AppAudience;
  subjectId: string;
  device?: DeviceDescription;
}): Promise<AppSession> {
  const { audience, subjectId, device } = params;
  const refresh = mintRefreshToken();

  const row = await db.mobileDevice.create({
    data: {
      audience,
      ...ownerColumn(audience, subjectId),
      refreshTokenHash: refresh.hash,
      tokenFamily: randomUUID(),
      deviceName: device?.deviceName ?? null,
      appVersion: device?.appVersion ?? null,
      androidSdk: device?.androidSdk ?? null,
    },
  });

  return {
    accessToken: await createAccessToken({ subject: subjectId, audience, deviceId: row.id }),
    refreshToken: refresh.token,
    expiresInSeconds: 15 * 60,
    deviceId: row.id,
  };
}

export type RefreshOutcome =
  | { ok: true; session: AppSession }
  | { ok: false; error: string };

/**
 * Trades a refresh token for a new pair.
 *
 * The old token stops working the moment it is used. If one that has
 * already been spent turns up again, the copy is on somebody else's
 * machine — so every device in that family is cut off rather than the
 * request merely refused.
 */
export async function refreshAppSession(params: {
  refreshToken: string;
  device?: DeviceDescription;
}): Promise<RefreshOutcome> {
  const hash = hashRefreshToken(params.refreshToken);
  const row = await db.mobileDevice.findUnique({ where: { refreshTokenHash: hash } });

  if (!row) return { ok: false, error: "Please sign in again." };

  if (row.revokedAt) {
    // A spent or revoked token being presented means it was copied; the
    // honest phone will simply be asked to sign in again.
    await db.mobileDevice.updateMany({
      where: { tokenFamily: row.tokenFamily, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "A refresh token was re-used." },
    });
    return { ok: false, error: "Please sign in again." };
  }

  const tooOld = Date.now() - row.lastSeenAt.getTime() > REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000;
  if (tooOld) {
    await db.mobileDevice.update({
      where: { id: row.id },
      data: { revokedAt: new Date(), revokedReason: "Not used for a long time." },
    });
    return { ok: false, error: "Please sign in again." };
  }

  const subjectId = row.memberId ?? row.alumniProfileId ?? row.patronId;
  if (!subjectId) return { ok: false, error: "Please sign in again." };

  const next = mintRefreshToken();
  const updated = await db.mobileDevice.update({
    where: { id: row.id },
    data: {
      refreshTokenHash: next.hash,
      lastSeenAt: new Date(),
      deviceName: params.device?.deviceName ?? row.deviceName,
      appVersion: params.device?.appVersion ?? row.appVersion,
      androidSdk: params.device?.androidSdk ?? row.androidSdk,
    },
  });

  return {
    ok: true,
    session: {
      accessToken: await createAccessToken({
        subject: subjectId,
        audience: updated.audience,
        deviceId: updated.id,
      }),
      refreshToken: next.token,
      expiresInSeconds: 15 * 60,
      deviceId: updated.id,
    },
  };
}

/** Signing out on this phone. Deliberately quiet about whether it existed. */
export async function endAppSession(deviceId: string): Promise<void> {
  await db.mobileDevice.updateMany({
    where: { id: deviceId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: "Signed out." },
  });
}

/** The device behind an access token, if it is still good for one. */
export async function activeDevice(deviceId: string): Promise<MobileDevice | null> {
  const row = await db.mobileDevice.findUnique({ where: { id: deviceId } });
  if (!row || row.revokedAt) return null;
  return row;
}

/**
 * Where to send this phone's notifications, and what it wants to hear.
 *
 * The same token can arrive on a device row that was signed in as somebody
 * else — a shared phone, a member who signed out and a graduate who signed
 * in. Firebase would then send one person's news to the other, so the token
 * is cleared from every other row first.
 */
export async function registerPushToken(params: {
  deviceId: string;
  pushToken: string | null;
  preferences?: { news?: boolean; events?: boolean; announcements?: boolean };
}): Promise<void> {
  const { deviceId, pushToken, preferences } = params;

  if (pushToken) {
    await db.mobileDevice.updateMany({
      where: { pushToken, NOT: { id: deviceId } },
      data: { pushToken: null },
    });
  }

  await db.mobileDevice.updateMany({
    where: { id: deviceId, revokedAt: null },
    data: {
      pushToken,
      lastSeenAt: new Date(),
      ...(preferences?.news === undefined ? {} : { notifyNews: preferences.news }),
      ...(preferences?.events === undefined ? {} : { notifyEvents: preferences.events }),
      ...(preferences?.announcements === undefined
        ? {}
        : { notifyAnnouncements: preferences.announcements }),
    },
  });
}

/** Somebody's signed-in phones, newest first, for a "your devices" screen. */
export async function listDevicesFor(audience: AppAudience, subjectId: string) {
  return db.mobileDevice.findMany({
    where: { ...ownerColumn(audience, subjectId), revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, deviceName: true, appVersion: true, lastSeenAt: true, createdAt: true },
  });
}
