import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, ApiError } from "../api/client";
import { CACHE_MINUTES } from "../config";

/**
 * Fetching a screen's worth of data, on a connection that comes and goes.
 *
 * A member on the Winneba campus network loses signal mid-request often
 * enough that "it failed, try again" is the wrong answer when we already
 * have yesterday's news sitting on the phone. So every list is cached, and
 * when the network is gone the cached copy is shown — clearly marked as
 * saved, never passed off as current.
 *
 * What is NOT cached: anything behind a sign-in that names a person. News,
 * events and the library are public and harmless on a shared phone; a
 * member's dues are not.
 */

export interface Loaded<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  /** True when what is on screen came off the phone, not the network. */
  fromCache: boolean;
  refresh: () => Promise<void>;
}

interface Options {
  /** Left off for anything that names a person. */
  cacheKey?: string;
  /** Skip entirely — for a screen that needs a sign-in the person lacks. */
  enabled?: boolean;
}

interface CacheEnvelope<T> {
  savedAt: number;
  data: T;
}

async function readCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache:${key}`);
    return raw ? (JSON.parse(raw) as CacheEnvelope<T>) : null;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(`cache:${key}`, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // A full disk is not a reason to fail the screen.
  }
}

/** Everything this app has saved — cleared when somebody signs out. */
export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith("cache:")));
  } catch {
    // Nothing worth reporting.
  }
}

export function useApi<T>(path: string, options: Options = {}): Loaded<T> {
  const { cacheKey, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!enabled) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);

      // Show what we already have first, so a slow connection means a
      // moment-old screen rather than a spinner.
      if (!isRefresh && cacheKey) {
        const cached = await readCache<T>(cacheKey);
        if (cached && alive.current) {
          setData(cached.data);
          setFromCache(true);
          setLoading(false);
          const fresh = Date.now() - cached.savedAt < CACHE_MINUTES * 60 * 1000;
          if (fresh) {
            // Still refetch in the background, but nothing is waiting on it.
            void api
              .get<T>(path)
              .then((result) => {
                if (!alive.current) return;
                setData(result);
                setFromCache(false);
                void writeCache(cacheKey, result);
              })
              .catch(() => {});
            return;
          }
        }
      }

      try {
        const result = await api.get<T>(path);
        if (!alive.current) return;
        setData(result);
        setError(null);
        setFromCache(false);
        if (cacheKey) void writeCache(cacheKey, result);
      } catch (err) {
        if (!alive.current) return;
        const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        // Only complain if there is nothing to show. A failed refresh over
        // a perfectly good cached list is not worth an error screen.
        if (data === null) setError(message);
      } finally {
        if (!alive.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    // `data` is read above but must not retrigger the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, cacheKey, enabled],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  return { data, error, loading, refreshing, fromCache, refresh: () => load(true) };
}
