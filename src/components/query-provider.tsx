"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-utils";
import { useState, useEffect, useRef, type ReactNode } from "react";

const CACHE_KEY = "teamflow_query_cache_v2";
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes
const SAVE_DEBOUNCE = 2000; // 2 seconds

interface CacheEntry {
  queryKey: unknown[];
  data: unknown;
  dataUpdatedAt: number;
}

interface CacheSnapshot {
  version: 2;
  timestamp: number;
  entries: CacheEntry[];
}

function isValidCache(snapshot: CacheSnapshot): boolean {
  if (!snapshot || snapshot.version !== 2) return false;
  const age = Date.now() - snapshot.timestamp;
  return age < CACHE_MAX_AGE;
}

function restoreCache(queryClient: ReturnType<typeof getQueryClient>) {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;

    const snapshot: CacheSnapshot = JSON.parse(raw);
    if (!isValidCache(snapshot)) {
      localStorage.removeItem(CACHE_KEY);
      return;
    }

    const now = Date.now();
    let restoredCount = 0;

    for (const entry of snapshot.entries) {
      if (entry.data === undefined) continue;
      
      const entryAge = now - entry.dataUpdatedAt;
      if (entryAge > CACHE_MAX_AGE) continue;

      queryClient.setQueryData(entry.queryKey, entry.data, {
        updatedAt: entry.dataUpdatedAt,
      });
      restoredCount++;
    }

    if (restoredCount > 0) {
      console.debug(`[QueryCache] Restored ${restoredCount} queries from cache`);
    }
  } catch {
    localStorage.removeItem(CACHE_KEY);
  }
}

function setupCachePersistence(queryClient: ReturnType<typeof getQueryClient>) {
  if (typeof window === "undefined") return;

  let saveTimeout: ReturnType<typeof setTimeout>;
  let lastSaveTime = 0;

  const saveCache = () => {
    const now = Date.now();
    if (now - lastSaveTime < 1000) return;
    lastSaveTime = now;

    try {
      const queries = queryClient.getQueryCache().getAll();
      const entries: CacheEntry[] = [];

      for (const query of queries) {
        if (
          query.state.data === undefined ||
          query.state.status !== "success"
        ) continue;

        const key = query.queryKey;
        const keyStr = JSON.stringify(key);
        if (keyStr.includes("mutation") || keyStr.length > 200) continue;

        entries.push({
          queryKey: [...key],
          data: query.state.data,
          dataUpdatedAt: query.state.dataUpdatedAt,
        });
      }

      if (entries.length === 0) return;

      const snapshot: CacheSnapshot = {
        version: 2,
        timestamp: Date.now(),
        entries: entries.slice(0, 50),
      };

      const serialized = JSON.stringify(snapshot);
      if (serialized.length > 2 * 1024 * 1024) {
        snapshot.entries = entries.slice(0, 20);
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage full or other error, silently ignore
    }
  };

  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveCache, SAVE_DEBOUNCE);
  });

  window.addEventListener("beforeunload", saveCache);

  return () => {
    clearTimeout(saveTimeout);
    window.removeEventListener("beforeunload", saveCache);
    unsubscribe();
  };
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    restoreCache(queryClient);
    const cleanup = setupCachePersistence(queryClient);
    return cleanup;
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
