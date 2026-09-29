import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "../api/client";

/**
 * Asking to be notified, and telling the association where to send.
 *
 * Deliberately not done at startup. A permission prompt on first launch,
 * before somebody has seen what the app is, is how an app gets refused
 * permanently — Android only asks once. This is called after they sign in,
 * when "we will tell you when there is news" means something.
 *
 * Firebase rotates the address on its own schedule, so this runs on every
 * launch of a signed-in app, not only the first.
 */

const ANDROID_CHANNEL = "assn-updates";

export async function prepareNotifications(): Promise<void> {
  if (Platform.OS !== "android") return;
  // The channel decides how a notification behaves — the sound, whether it
  // appears on the lock screen — and on Android 8 and up nothing arrives
  // without one.
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: "Association updates",
    description: "News, events and announcements from the association.",
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export interface PushPreferences {
  news?: boolean;
  events?: boolean;
  announcements?: boolean;
}

/**
 * Registers this phone, if the person allows it.
 *
 * Returns what happened rather than throwing: being told no is an ordinary
 * outcome, and the app carries on perfectly well without notifications.
 */
export async function registerForPush(preferences?: PushPreferences): Promise<"granted" | "denied" | "unavailable"> {
  if (!Device.isDevice) return "unavailable"; // An emulator has no address.

  await prepareNotifications();

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return "denied";

  try {
    const { data } = await Notifications.getDevicePushTokenAsync();
    if (typeof data !== "string" || !data) return "unavailable";
    await api.post("/devices", { pushToken: data, preferences });
    return "granted";
  } catch {
    // Firebase not reachable, or the server refused. Not worth stopping
    // anything for: the app works, it just stays quiet.
    return "unavailable";
  }
}

/** Tells the association to stop sending here. Not the same as signing out. */
export async function forgetPushToken(): Promise<void> {
  await api.post("/devices", { pushToken: null });
}

/** Changes what this phone wants to hear about, leaving the address alone. */
export async function updatePushPreferences(preferences: PushPreferences): Promise<void> {
  if (!Device.isDevice) return;
  const { data } = await Notifications.getDevicePushTokenAsync();
  await api.post("/devices", { pushToken: typeof data === "string" ? data : null, preferences });
}
