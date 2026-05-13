"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";

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

export function useDashboardData(): DashboardData {
  const [tasks, setTasks] = useState<DataRecord[]>([]);
  const [projects, setProjects] = useState<DataRecord[]>([]);
  const [users, setUsers] = useState<DataRecord[]>([]);
  const [activities] = useState<DataRecord[]>([]);
  const [meetings] = useState<DataRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    useAppStore.getState().setApiLoading(true);
    setError(null);
    try {
      const activeWsId = useAppStore.getState().activeWorkspaceId;
      const params = activeWsId ? `?workspaceId=${activeWsId}` : "";
      const usersUrl = activeWsId
        ? `/api/users?workspaceId=${activeWsId}`
        : "/api/users";
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        fetch(`/api/tasks${params}`),
        fetch(`/api/projects${params}`),
        fetch(usersUrl),
      ]);

      let fetchedTasks: DataRecord[] = [];
      let fetchedProjects: DataRecord[] = [];
      let fetchedUsers: DataRecord[] = [];

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        fetchedTasks = Array.isArray(data) ? data : data.tasks || [];
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        fetchedProjects = Array.isArray(data) ? data : data.projects || [];
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        fetchedUsers = Array.isArray(data) ? data : data.users || [];
      }

      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
      setUsers(fetchedUsers);

      // Update store counts for sidebar badges
      useAppStore.getState().setCounts({
        taskCount: fetchedTasks.length,
        projectCount: fetchedProjects.length,
        meetingCount: 0,
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error("useDashboardData fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      setTasks([]);
      setProjects([]);
      setUsers([]);
    } finally {
      setIsLoading(false);
      useAppStore.getState().setApiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate stats from real data
  const totalTasks = tasks.length || 0;
  const doneTasks =
    tasks.filter((t: DataRecord) => t.status === "done").length || 0;
  const activeProjects =
    projects.filter((p: DataRecord) => p.status === "active").length || 0;
  const inProgress =
    tasks.filter((t: DataRecord) => t.status === "in_progress").length || 0;
  const completionRate =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const stats: DashboardStats = {
    totalTasks,
    activeProjects,
    inProgress,
    completionRate,
    taskTrend: 0,
    projectTrend: 0,
    inProgressTrend: 0,
    completionTrend: 0,
  };

  return {
    stats,
    tasks,
    projects,
    users,
    activities,
    meetings,
    isLoading,
    error,
    refetch: fetchData,
    lastUpdated,
  };
}
