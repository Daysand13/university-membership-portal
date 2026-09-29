import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as Device from "expo-device";
import * as Application from "expo-application";
import { Platform } from "react-native";
import { api, configureTokens, setAccessToken } from "../api/client";
import type { Identity, Me, SignedIn } from "../api/types";
import { clearSession, loadSession, saveSession, saveTokens } from "./storage";
import { forgetPushToken } from "../push/register";

/**
 * Who is signed in, for the whole app.
 *
 * The app starts signed out and looks for a saved session while the splash
 * is still up, so nobody sees a sign-in screen flash past before their own
 * dashboard appears.
 *
 * Signing out is deliberately thorough: the server is told, the tokens are
 * wiped, and the Firebase address goes with them — a phone that has been
 * handed on should stop receiving the association's notifications.
 */

type SignInResult =
  | { kind: "signed-in" }
  | { kind: "choose"; identities: Identity[] }
  | { kind: "failed"; message: string };

interface AuthValue {
  ready: boolean;
  identity: Identity | null;
  me: Me | null;
  signedIn: boolean;
  signIn: (identifier: string, password: string, audience?: Identity["audience"]) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  /** Set when a session ended by itself, to be shown once on the sign-in screen. */
  endedMessage: string | null;
  clearEndedMessage: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function describeThisPhone() {
  return {
    deviceName: [Device.manufacturer, Device.modelName].filter(Boolean).join(" ") || "Android phone",
    appVersion: Application.nativeApplicationVersion ?? undefined,
    androidSdk: Platform.OS === "android" ? Number(Platform.Version) : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [endedMessage, setEndedMessage] = useState<string | null>(null);

  const forget = useCallback(async (reason: string) => {
    setAccessToken(null, null);
    await clearSession();
    setIdentity(null);
    setMe(null);
    setEndedMessage(reason);
  }, []);

  // Wired once, so the API client can save rotated tokens and hand back
  // control when a session is over.
  useEffect(() => {
    configureTokens({
      accessToken: null,
      refreshToken: null,
      onRefreshed: saveTokens,
      onSignedOut: forget,
    });
  }, [forget]);

  const loadMe = useCallback(async () => {
    try {
      setMe(await api.get<Me>("/me"));
    } catch {
      // Leave whatever was there. A failed /me is not a reason to throw
      // somebody out of a screen they are already looking at.
    }
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await loadSession();
      if (saved) {
        setAccessToken(saved.accessToken, saved.refreshToken);
        setIdentity(saved.identity);
        await loadMe();
      }
      setReady(true);
    })();
  }, [loadMe]);

  const signIn = useCallback<AuthValue["signIn"]>(
    async (identifier, password, audience) => {
      try {
        const response = await api.post<SignedIn | { ok: true; chooseFrom: Identity[] }>(
          "/auth/login",
          { identifier, password, audience, device: describeThisPhone() },
          { open: true },
        );

        if ("chooseFrom" in response) return { kind: "choose", identities: response.chooseFrom };

        setAccessToken(response.accessToken, response.refreshToken);
        await saveSession({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          identity: response.identity,
          deviceId: response.deviceId,
        });
        setIdentity(response.identity);
        setEndedMessage(null);
        await loadMe();
        return { kind: "signed-in" };
      } catch (err) {
        return { kind: "failed", message: (err as Error).message };
      }
    },
    [loadMe],
  );

  const signOut = useCallback(async () => {
    // Stop the notifications first: if the request to sign out fails, the
    // phone should still have gone quiet.
    await forgetPushToken().catch(() => {});
    await api.post("/auth/logout").catch(() => {});
    setAccessToken(null, null);
    await clearSession();
    setIdentity(null);
    setMe(null);
    setEndedMessage(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      identity,
      me,
      signedIn: identity !== null,
      signIn,
      signOut,
      refreshMe: loadMe,
      endedMessage,
      clearEndedMessage: () => setEndedMessage(null),
    }),
    [ready, identity, me, signIn, signOut, loadMe, endedMessage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth was called outside AuthProvider.");
  return value;
}
