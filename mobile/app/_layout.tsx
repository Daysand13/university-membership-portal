import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";
import { DisplayProvider, useDisplay } from "../src/a11y/preferences";
import { ReadingProvider } from "../src/a11y/reading";
import { HeaderControls } from "../src/a11y/A11yControls";
import { prepareNotifications } from "../src/push/register";
import { UpdateGate } from "../src/update/UpdateGate";
import { GradientHeader } from "../src/ui/components";

/**
 * The whole app, wrapped once — and which half of it somebody sees.
 *
 * Signed out, the app is the welcome screen, signing in, and the four ways
 * to join. Signed in, it is the dashboard with News, Events and More along
 * the bottom. The two halves are guarded (Stack.Protected): the moment a
 * session starts or ends, the router moves to the half that now applies.
 * Nothing navigates by hand on signing in — which is exactly where the
 * "signed in but still on the sign-in screen" fault lived.
 *
 * The splash stays up until both the saved session and the display settings
 * have been read, so nobody sees the welcome screen flash before their own
 * dashboard, or a frame of small text before the large text they chose.
 */

void SplashScreen.preventAutoHideAsync().catch(() => {});

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

function Navigation() {
  const auth = useAuth();
  const display = useDisplay();
  const ready = auth.ready && display.ready;
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // A tapped notification is held until the person is signed in: opened
  // signed out, the article it names is behind the sign-in, and it should
  // still be where they land once they are through it.
  useEffect(() => {
    void prepareNotifications();
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const path = pathFrom(response?.notification ?? null);
      if (path) setPendingPath(path);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = pathFrom(response.notification);
      if (path) setPendingPath(path);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (ready && auth.signedIn && pendingPath) {
      router.push(pendingPath as never);
      setPendingPath(null);
    }
  }, [ready, auth.signedIn, pendingPath]);

  const { colours, type } = display.theme;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerBackground: () => <GradientHeader />,
          headerTintColor: colours.onHeader,
          headerTitleStyle: { fontWeight: "700", fontSize: type.subheading + 1 },
          headerShadowVisible: false,
          headerRight: () => <HeaderControls />,
          contentStyle: { backgroundColor: colours.background },
        }}
      >
        <Stack.Protected guard={auth.signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="news/[slug]" options={{ title: "News" }} />
          <Stack.Screen name="events/[slug]" options={{ title: "Event" }} />
          <Stack.Screen name="announcements" options={{ title: "Announcements" }} />
          <Stack.Screen name="dues" options={{ title: "Dues" }} />
          <Stack.Screen name="directory" options={{ title: "Alumni Directory" }} />
          <Stack.Screen name="library" options={{ title: "Library" }} />
          <Stack.Screen name="elections" options={{ title: "Elections" }} />
        </Stack.Protected>

        <Stack.Protected guard={!auth.signedIn}>
          <Stack.Screen name="welcome" options={{ title: "ASSN" }} />
          <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
          <Stack.Screen name="join/index" options={{ title: "Join the association" }} />
          <Stack.Screen name="join/student" options={{ title: "Student membership" }} />
          <Stack.Screen name="join/alumni" options={{ title: "Alumni network" }} />
          <Stack.Screen name="join/patron" options={{ title: "Become a patron" }} />
          <Stack.Screen name="join/sent" options={{ title: "Sent", headerBackVisible: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <DisplayProvider>
      <AuthProvider>
        <ReadingProvider>
          <UpdateGate>
            <Navigation />
          </UpdateGate>
        </ReadingProvider>
      </AuthProvider>
    </DisplayProvider>
  );
}
