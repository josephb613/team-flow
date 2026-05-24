"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/query-utils";

interface DashboardStats {
  totalTasks: number;
  activeProjects: number;
  inProgress: number;
  completionRate: number;
  taskTrend: number;
  projectTrend: number;
  inProgressTrend: number;
  completionTrend: number;
}

type DataRecord = Record<string, unknown>;

interface DashboardData {
  stats: DashboardStats;
  tasks: DataRecord[];
  projects: DataRecord[];
  users: DataRecord[];
  activities: DataRecord[];
  meetings: DataRecord[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

const STALE_TIME = 2 * 60 * 1000; // 2 minutes
const GC_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * Hook de données dashboard optimisé utilisant React Query.
 * Utilise le cache populé par useBootstrapData pour un affichage instantané.
 * Ne refetch que si les données sont stale.
 */
export function useDashboardData(): DashboardData {
  const queryClient = useQueryClient();
  const activeWsId = useAppStore((s) => s.activeWorkspaceId);
  const setCounts = useAppStore((s) => s.setCounts);

  const tasksQuery = useQuery({
    queryKey: ["tasks", activeWsId],
    queryFn: () => fetchJson<DataRecord[]>(`/api/tasks?workspaceId=${activeWsId}`),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!activeWsId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const projectsQuery = useQuery({
    queryKey: ["projects", activeWsId],
    queryFn: () => fetchJson<DataRecord[]>(`/api/projects?workspaceId=${activeWsId}`),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!activeWsId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const usersQuery = useQuery({
    queryKey: ["users", activeWsId],
    queryFn: () => fetchJson<DataRecord[]>(`/api/users?workspaceId=${activeWsId}`),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!activeWsId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const tasks = tasksQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const stats = useMemo<DashboardStats>(() => {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "done").length;
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    setCounts({
      taskCount: totalTasks,
      projectCount: projects.length,
      meetingCount: 0,
    });

    return {
      totalTasks,
      activeProjects,
      inProgress,
      completionRate,
      taskTrend: 0,
      projectTrend: 0,
      inProgressTrend: 0,
      completionTrend: 0,
    };
  }, [tasks, projects, setCounts]);

  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading || usersQuery.isLoading;
  const error = tasksQuery.error || projectsQuery.error || usersQuery.error;

  const refetch = () => {
    tasksQuery.refetch();
    projectsQuery.refetch();
    usersQuery.refetch();
  };

  const lastUpdated = useMemo(() => {
    const timestamps = [
      tasksQuery.dataUpdatedAt,
      projectsQuery.dataUpdatedAt,
      usersQuery.dataUpdatedAt,
    ].filter(Boolean);
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps));
  }, [tasksQuery.dataUpdatedAt, projectsQuery.dataUpdatedAt, usersQuery.dataUpdatedAt]);

  return {
    stats,
    tasks,
    projects,
    users,
    activities: [],
    meetings: [],
    isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch data") : null,
    refetch,
    lastUpdated,
  };
}
