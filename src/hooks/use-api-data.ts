"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const isProduction = process.env.NODE_ENV === "production";

interface UseApiDataOptions<T> {
  /** Fallback mock data if API returns empty or fails (dev only) */
  fallback?: T;
  /** Whether to fetch immediately on mount */
  immediate?: boolean;
  /** Query params to append to the endpoint URL */
  params?: Record<string, string>;
}

interface UseApiDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Generic hook to fetch data from an API endpoint.
 * In development, can fall back to mock data for empty results or errors.
 * In production, errors are surfaced and no mock fallback is used.
 */
export function useApiData<T = unknown>(
  endpoint: string,
  options: UseApiDataOptions<T> = {},
): UseApiDataResult<T> {
  const { fallback, immediate = true, params } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Build endpoint URL with query params
  const resolvedEndpoint = params
    ? `${endpoint}?${new URLSearchParams(params).toString()}`
    : endpoint;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const processResult = useCallback((result: unknown) => {
    // Always use the API result as-is, even if empty.
    // Mock fallback is only used on actual fetch errors (see catch below).
    setData(result as T);
  }, []);

  useEffect(() => {
    if (!immediate) return;

    let cancelled = false;

    const fetchData = async () => {
      setError(null);

      try {
        const response = await fetch(resolvedEndpoint);

        if (cancelled || !mountedRef.current) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const jsonData = await response.json();
        const result = Array.isArray(jsonData)
          ? jsonData
          : (jsonData.data ?? jsonData);

        if (cancelled || !mountedRef.current) return;

        processResult(result);
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        console.error(`Error fetching ${endpoint}:`, err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");

        // Only use fallback in dev mode
        if (!isProduction && fallback) {
          setData(fallback);
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [resolvedEndpoint, endpoint, immediate, fallback, processResult]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(resolvedEndpoint);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonData = await response.json();
      const result = Array.isArray(jsonData)
        ? jsonData
        : (jsonData.data ?? jsonData);

      processResult(result);
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");

      if (!isProduction && fallback) {
        setData(fallback);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [resolvedEndpoint, fallback, processResult]);

  return { data, isLoading, error, refetch };
}
