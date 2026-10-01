import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildTheme, DEFAULT_PREFERENCES, type DisplayPreferences, type TextSize, type Theme } from "../theme";

/**
 * Text size, high contrast and dark mode — the website's display settings,
 * kept on this phone.
 *
 * AsyncStorage rather than the secure store: these are not secret, and the
 * keystore is a slower thing to read on every launch. Read before the first
 * screen is drawn (the splash waits for it), so somebody who chose larger
 * text never sees a frame of the small one.
 */

const STORAGE_KEY = "assn.display";

interface DisplayValue {
  ready: boolean;
  preferences: DisplayPreferences;
  theme: Theme;
  setTextSize: (size: TextSize) => void;
  setHighContrast: (on: boolean) => void;
  setDark: (on: boolean) => void;
}

const DisplayContext = createContext<DisplayValue | null>(null);

function isTextSize(value: unknown): value is TextSize {
  return value === "standard" || value === "large" || value === "larger";
}

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<DisplayPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<DisplayPreferences>;
          setPreferences({
            textSize: isTextSize(saved.textSize) ? saved.textSize : DEFAULT_PREFERENCES.textSize,
            highContrast: saved.highContrast === true,
            dark: saved.dark === true,
          });
        }
      } catch {
        // Unreadable storage costs somebody their settings, not the app.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const update = useCallback((change: Partial<DisplayPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...change };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<DisplayValue>(
    () => ({
      ready,
      preferences,
      theme: buildTheme(preferences),
      setTextSize: (textSize) => update({ textSize }),
      setHighContrast: (highContrast) => update({ highContrast }),
      setDark: (dark) => update({ dark }),
    }),
    [ready, preferences, update],
  );

  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>;
}

export function useDisplay(): DisplayValue {
  const value = useContext(DisplayContext);
  if (!value) throw new Error("useDisplay was called outside DisplayProvider.");
  return value;
}

export function useTheme(): Theme {
  return useDisplay().theme;
}

/**
 * Styles that follow the theme.
 *
 *   const useStyles = makeStyles((t) => ({ title: { color: t.colours.heading } }));
 *   function Screen() { const styles = useStyles(); ... }
 *
 * Built once per theme, not on every render.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(build: (theme: Theme) => T) {
  const cache = new WeakMap<Theme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(build(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}
