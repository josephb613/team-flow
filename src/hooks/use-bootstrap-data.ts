"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { useEffect, useRef } from "react";
import type { Workspace, User, Channel, Task, Project, BoardColumn } from "@/lib/types";

interface BootstrapData {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  users: User[];
  channels: Channel[];
  tasks: Task[];
  projects: Project[];
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>;
  columns: {
    tasks: BoardColumn[];
    opportunities: BoardColumn[];
  };
  _meta: {
    timestamp: number;
    userId: string;
  };
}

const BOOTSTRAP_QUERY_KEY = ["bootstrap"] as const;
const BOOTSTRAP_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const BOOTSTRAP_CACHE_TIME = 30 * 60 * 1000; // 30 minutes

async function fetchBootstrapData(workspaceId?: string): Promise<BootstrapData> {
  const params = workspaceId ? `?workspaceId=${workspaceId}` : "";
  const res = await fetch(`/api/bootstrap${params}`);
  
  if (!res.ok) {
    throw new Error(`Bootstrap fetch failed: ${res.status}`);
  }
  
  return res.json();
}

/**
 * Hook to fetch all initial application data in a single request.
 * Uses React Query for caching, deduplication, and background refresh.
 * 
 * On success, automatically syncs data to Zustand store and
 * populates individual query caches for views that need them.
 */
export function useBootstrapData(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const setWorkspaces = useAppStore((s) => s.setWorkspaces);
  const setUsers = useAppStore((s) => s.setUsers);
  const setChannels = useAppStore((s) => s.setChannels);
  const setColumns = useAppStore((s) => s.setColumns);
  const setColumnsOpportunity = useAppStore((s) => s.setColumnsOpportunity);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const setCounts = useAppStore((s) => s.setCounts);
  
  // Track if we've synced to avoid re-syncing on every render
  const hasSyncedRef = useRef(false);
  
  const query = useQuery({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: () => fetchBootstrapData(activeWorkspaceId || undefined),
    staleTime: BOOTSTRAP_STALE_TIME,
    gcTime: BOOTSTRAP_CACHE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: options?.enabled !== false,
  });

  // Sync bootstrap data to Zustand store and populate individual query caches
  useEffect(() => {
    if (!query.data || hasSyncedRef.current) return;
    
    const data = query.data;
    hasSyncedRef.current = true;

    // Sync to Zustand store
    setWorkspaces(data.workspaces);
    setUsers(data.users);
    setChannels(data.channels);
    setColumns(data.columns.tasks);
    setColumnsOpportunity(data.columns.opportunities);
    
    // Map notifications to store format (notifications are empty for now)
    if (data.notifications && data.notifications.length > 0) {
      const mappedNotifications = data.notifications.map((n) => ({
        id: n.id,
        type: (n.type || "system") as "mention" | "assignment" | "comment" | "deadline" | "invitation" | "system",
        title: n.title || "",
        message: n.message || "",
        read: n.read,
        timestamp: n.createdAt,
      }));
      setNotifications(mappedNotifications);
    }

    // Update counts for sidebar badges
    setCounts({
      taskCount: data.tasks.length,
      projectCount: data.projects.length,
      meetingCount: 0,
    });

    // Populate individual query caches so other views have instant data
    const wsId = data.activeWorkspaceId;
    if (wsId) {
      queryClient.setQueryData(["tasks", wsId], data.tasks);
      queryClient.setQueryData(["projects", wsId], data.projects);
      queryClient.setQueryData(["users", wsId], data.users);
      queryClient.setQueryData(["channels", wsId], data.channels);
      queryClient.setQueryData(["notifications"], data.notifications);
    }
  }, [
    query.data,
    queryClient,
    setWorkspaces,
    setUsers,
    setChannels,
    setColumns,
    setColumnsOpportunity,
    setNotifications,
    setCounts,
  ]);

  // Reset sync flag when workspace changes
  useEffect(() => {
    hasSyncedRef.current = false;
  }, [activeWorkspaceId]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Prefetch bootstrap data - useful to call during auth flow
 * before the main app renders.
 */
export function prefetchBootstrapData(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.prefetchQuery({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: () => fetchBootstrapData(),
    staleTime: BOOTSTRAP_STALE_TIME,
  });
}

/**
 * Invalidate bootstrap cache - call after mutations that affect
 * initial data (workspace changes, etc.)
 */
export function invalidateBootstrapCache(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
}
