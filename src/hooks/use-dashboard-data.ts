'use client';

import { useMemo } from 'react';
import { useAppData } from '@/hooks/use-app-data';
import {
  compareCounts,
  completionRateAt,
  countActiveProjects,
  countProjectsActivatedInPeriod,
  countTasksCompletedInPeriod,
  getPeriodBounds,
} from '@/lib/analytics';

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
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useDashboardData(): DashboardData {
  const {
    tasks,
    projects,
    users,
    auditLogs,
    calendarEvents,
    loading,
    error,
    refetch,
  } = useAppData();

  const stats = useMemo<DashboardStats>(() => {
    const totalTasks = tasks.length;
    const activeProjects = countActiveProjects(projects);
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const doneTasks = tasks.filter((t) => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const { currentStart, previousStart, now } = getPeriodBounds(7);
    const completedThisWeek = countTasksCompletedInPeriod(tasks, currentStart, now);
    const completedLastWeek = countTasksCompletedInPeriod(tasks, previousStart, currentStart);
    const inProgressThisWeek = tasks.filter(
      (t) => t.status === 'in_progress' && new Date(t.updatedAt) >= currentStart
    ).length;
    const inProgressLastWeek = tasks.filter(
      (t) =>
        t.status === 'in_progress' &&
        new Date(t.updatedAt) >= previousStart &&
        new Date(t.updatedAt) < currentStart
    ).length;

    return {
      totalTasks,
      activeProjects,
      inProgress,
      completionRate,
      taskTrend: compareCounts(completedThisWeek, completedLastWeek).delta,
      projectTrend: compareCounts(
        countProjectsActivatedInPeriod(projects, currentStart, now),
        countProjectsActivatedInPeriod(projects, previousStart, currentStart)
      ).delta,
      inProgressTrend: compareCounts(inProgressThisWeek, inProgressLastWeek).delta,
      completionTrend: compareCounts(completionRate, completionRateAt(tasks, currentStart)).delta,
    };
  }, [tasks, projects]);

  return {
    stats,
    tasks: tasks as unknown as DataRecord[],
    projects: projects as unknown as DataRecord[],
    users: users as unknown as DataRecord[],
    activities: auditLogs as unknown as DataRecord[],
    meetings: calendarEvents as unknown as DataRecord[],
    isLoading: loading,
    error,
    refetch,
    lastUpdated: loading ? null : new Date(),
  };
}
