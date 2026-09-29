import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { AuthProvider } from "../src/auth/AuthContext";
import { prepareNotifications } from "../src/push/register";
import { UpdateGate } from "../src/update/UpdateGate";
import { GradientHeader } from "../src/ui/components";
import { colours } from "../src/theme";

/**
 * The whole app, wrapped once.
 *
 * Tapping a notification opens what it was about. The server puts a path
 * on every one — /news/agm-2026 — and this is what turns that into a
 * screen, whether the app was already open or started by the tap.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function pathFrom(notification: Notifications.Notification | null): string | null {
  const path = notification?.request.content.data?.path;
  // Only our own paths, and only ones that look like a screen. A
  // notification is data from outside; it does not get to send the app
  // anywhere it likes.
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : null;
}

export default function RootLayout() {
  useEffect(() => {
    void prepareNotifications();

    // Opened by tapping a notification while the app was closed.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const path = pathFrom(response?.notification ?? null);
      if (path) router.push(path as never);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = pathFrom(response.notification);
      if (path) router.push(path as never);
    });
    return () => subscription.remove();
  }, []);

  return (
    <AuthProvider>
      <UpdateGate>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerBackground: () => <GradientHeader />,
          headerTintColor: colours.white,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colours.surfaceMuted },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
        <Stack.Screen name="news/[slug]" options={{ title: "News" }} />
        <Stack.Screen name="events/[slug]" options={{ title: "Event" }} />
        <Stack.Screen name="library" options={{ title: "Library" }} />
        <Stack.Screen name="elections" options={{ title: "Elections" }} />
        <Stack.Screen name="announcements" options={{ title: "Announcements" }} />
        <Stack.Screen name="dues" options={{ title: "Dues" }} />
        <Stack.Screen name="directory" options={{ title: "Alumni Directory" }} />
      </Stack>
      </UpdateGate>
    </AuthProvider>
  );
}
