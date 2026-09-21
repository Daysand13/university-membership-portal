import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { AdminUser, PollingStation } from "@/generated/prisma/client";

/**
 * The terminals standing in the polling centres.
 *
 * Each one is registered here before the day, and given a code and a key.
 * The key is shown once, at registration, and only its hash is kept — the
 * same way a password is handled, because that is what it is: the thing
 * that lets a machine in a hall speak for the association.
 */

/** Readable aloud over a phone line and hard to mistype: no O/0, no I/1. */
const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function readableKey(groups = 4, size = 5): string {
  const bytes = randomBytes(groups * size);
  const chars = Array.from(bytes, (b) => KEY_ALPHABET[b % KEY_ALPHABET.length]);
  return Array.from({ length: groups }, (_, g) => chars.slice(g * size, (g + 1) * size).join("")).join("-");
}

export interface RegisteredStation {
  station: PollingStation;
  /** Shown once. Nobody, including this application, can read it again. */
  key: string;
}

export async function registerStation(params: {
  code: string;
  name: string;
  actor: Pick<AdminUser, "id">;
}): Promise<RegisteredStation> {
  const code = params.code.trim().toUpperCase();
  const key = readableKey();
  const station = await db.pollingStation.create({
    data: {
      code,
      name: params.name.trim(),
      keyHash: await hashPassword(key),
      createdById: params.actor.id,
    },
  });

  await db.auditLog.create({
    data: {
      adminId: params.actor.id,
      action: "REGISTER_POLLING_STATION",
      entityType: "PollingStation",
      entityId: station.id,
      newValue: { code, name: station.name },
    },
  });

  return { station, key };
}

/** A new key for a terminal whose old one has been seen by the wrong eyes. */
export async function reissueStationKey(params: {
  stationId: string;
  actor: Pick<AdminUser, "id">;
}): Promise<RegisteredStation> {
  const key = readableKey();
  const station = await db.pollingStation.update({
    where: { id: params.stationId },
    data: { keyHash: await hashPassword(key) },
  });

  await db.auditLog.create({
    data: {
      adminId: params.actor.id,
      action: "REISSUE_STATION_KEY",
      entityType: "PollingStation",
      entityId: station.id,
      newValue: { code: station.code },
    },
  });

  return { station, key };
}

export async function setStationActive(params: {
  stationId: string;
  isActive: boolean;
  actor: Pick<AdminUser, "id">;
}): Promise<PollingStation> {
  const station = await db.pollingStation.update({
    where: { id: params.stationId },
    data: { isActive: params.isActive },
  });

  await db.auditLog.create({
    data: {
      adminId: params.actor.id,
      action: params.isActive ? "ACTIVATE_POLLING_STATION" : "DEACTIVATE_POLLING_STATION",
      entityType: "PollingStation",
      entityId: station.id,
      newValue: { code: station.code },
    },
  });

  return station;
}

export async function listStations() {
  return db.pollingStation.findMany({
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
    include: { _count: { select: { ballots: true } } },
  });
}

/**
 * Who is on the other end of an API call from a hall.
 *
 * Returns the station only when the code is registered, still active and
 * the key matches. Every successful check notes the time, which is how the
 * commission sees from the office that a centre's terminal is alive.
 */
export async function authenticateStation(
  code: string | null,
  key: string | null,
): Promise<PollingStation | null> {
  if (!code || !key) return null;
  const station = await db.pollingStation.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!station || !station.isActive) return null;
  if (!(await verifyPassword(key, station.keyHash))) return null;

  // Best effort: a terminal that has voted successfully shouldn't be told
  // off because a bookkeeping write failed.
  await db.pollingStation
    .update({ where: { id: station.id }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);

  return station;
}
