"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { fetchJson } from "@/lib/query-utils";

interface UseApiQueryOptions<T> {
  /** Query params to append to the endpoint URL */
  params?: Record<string, string>;
  /** Whether to include workspaceId in query key and params (default: true) */
  scoped?: boolean;
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
  /** Custom stale time in ms (default: 2 minutes) */
  staleTime?: number;
  /** Fallback data for development (ignored in production) */
  fallback?: T;
}

interface UseApiQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
}

const DEFAULT_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const DEFAULT_GC_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * React Query wrapper that replaces useApiData.
 * Provides caching, deduplication, and background refresh.
 * 
 * @param endpoint - API endpoint (e.g., "/api/meetings")
 * @param options - Query options
 * @returns Query result with data, loading, error states and refetch function
 * 
 * @example
 * // Basic usage (workspace-scoped by default)
 * const { data: meetings, isLoading } = useApiQuery<Meeting[]>("/api/meetings");
 * 
 * // With custom params
 * const { data } = useApiQuery<Activity[]>("/api/activity", {
 *   params: { projectId: "123" }
 * });
 * 
 * // Global (not workspace-scoped)
 * const { data: users } = useApiQuery<User[]>("/api/users", { scoped: false });
 */
export function useApiQuery<T = unknown>(
  endpoint: string,
  options: UseApiQueryOptions<T> = {}
): UseApiQueryResult<T> {
  const {
    params = {},
    scoped = true,
    enabled = true,
    staleTime = DEFAULT_STALE_TIME,
    fallback,
  } = options;

  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const queryClient = useQueryClient();

  // Build query params
  const queryParams = { ...params };
  if (scoped && activeWorkspaceId) {
    queryParams.workspaceId = activeWorkspaceId;
  }

  // Build URL with params
  const hasParams = Object.keys(queryParams).length > 0;
  const url = hasParams
    ? `${endpoint}?${new URLSearchParams(queryParams).toString()}`
    : endpoint;

  // Build query key for cache
  const queryKey = scoped
    ? [endpoint, activeWorkspaceId, params]
    : [endpoint, params];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchJson<T>(url),
    staleTime,
    gcTime: DEFAULT_GC_TIME,
    enabled: enabled && (!scoped || !!activeWorkspaceId),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Use fallback in dev if query failed and fallback provided
  const isDev = process.env.NODE_ENV !== "production";
  const data = query.data ?? (isDev && query.isError && fallback ? fallback : null);

  return {
    data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? (query.error instanceof Error ? query.error.message : "Failed to fetch data") : null,
    refetch: () => {
      query.refetch();
    },
  };
}

/**
 * Prefetch data for an endpoint - useful for hover prefetch
 */
export function prefetchApiQuery<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  endpoint: string,
  workspaceId?: string,
  params?: Record<string, string>
) {
  const queryParams = { ...params };
  if (workspaceId) {
    queryParams.workspaceId = workspaceId;
  }

  const hasParams = Object.keys(queryParams).length > 0;
  const url = hasParams
    ? `${endpoint}?${new URLSearchParams(queryParams).toString()}`
    : endpoint;

  const queryKey = workspaceId
    ? [endpoint, workspaceId, params]
    : [endpoint, params];

  return queryClient.prefetchQuery({
    queryKey,
    queryFn: () => fetchJson<T>(url),
    staleTime: DEFAULT_STALE_TIME,
  });
}
