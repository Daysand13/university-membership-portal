import * as SecureStore from "expo-secure-store";
import type { Identity } from "../api/types";

/**
 * Where the phone keeps its tokens.
 *
 * expo-secure-store, which on Android is the system keystore — not plain
 * preferences, which any app with root or a backup extraction can read.
 * A refresh token is good for sixty days; somewhere that survives a lost
 * handset is the wrong place for it.
 *
 * Who is signed in is kept beside it. Not secret, but there is no sense
 * putting half of a session in one place and half in another.
 */

const ACCESS = "assn.accessToken";
const REFRESH = "assn.refreshToken";
const IDENTITY = "assn.identity";
const DEVICE = "assn.deviceId";

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  identity: Identity;
  deviceId: string;
}

export async function saveSession(session: StoredSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS, session.accessToken),
    SecureStore.setItemAsync(REFRESH, session.refreshToken),
    SecureStore.setItemAsync(IDENTITY, JSON.stringify(session.identity)),
    SecureStore.setItemAsync(DEVICE, session.deviceId),
  ]);
}

export async function saveTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH, tokens.refreshToken),
  ]);
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const [accessToken, refreshToken, identityRaw, deviceId] = await Promise.all([
      SecureStore.getItemAsync(ACCESS),
      SecureStore.getItemAsync(REFRESH),
      SecureStore.getItemAsync(IDENTITY),
      SecureStore.getItemAsync(DEVICE),
    ]);
    if (!accessToken || !refreshToken || !identityRaw || !deviceId) return null;
    return { accessToken, refreshToken, identity: JSON.parse(identityRaw) as Identity, deviceId };
  } catch {
    // A keystore that will not open — a restored backup, usually. Treat it
    // as signed out rather than crashing on launch.
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS),
    SecureStore.deleteItemAsync(REFRESH),
    SecureStore.deleteItemAsync(IDENTITY),
    SecureStore.deleteItemAsync(DEVICE),
  ]);
}
